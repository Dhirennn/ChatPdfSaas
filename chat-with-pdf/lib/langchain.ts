import { ChatOpenAI } from "@langchain/openai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import pineconeClient from "./pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { PineconeConflictError } from "@pinecone-database/pinecone/dist/errors";
import { Index, RecordMetadata } from "@pinecone-database/pinecone";
import { adminDb } from "../firebaseAdmin";
import { auth } from "@clerk/nextjs/server";
import pLimit from 'p-limit';

// Initialize the OpenAI model with API key and model name
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o",
});

export const indexName = "dhiren";

async function fetchMessagesFromDB(docId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not found");
  }

  console.log("--- Fetching chat history from the firestore database... ---");

  const LIMIT = 6;

  // Get the last 6 messages from the chat history
  const chats = await adminDb
    .collection(`users`)
    .doc(userId)
    .collection("files")
    .doc(docId)
    .collection("chat")
    .orderBy("createdAt", "desc")
    // .limit(LIMIT) // if want to limit the number of messages
    .get();

  const chatHistory = chats.docs.map((doc) =>
    doc.data().role === "human"
      ? new HumanMessage(doc.data().message)
      : new AIMessage(doc.data().message)
  );

  console.log(
    `--- fetched last ${chatHistory.length} messages successfully ---`
  );
  console.log(chatHistory.map((msg) => msg.content.toString()));

  return chatHistory;
}

export const generateDocs = async (docId: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("User not found");

  const firebaseRef = await adminDb
    .collection("users")
    .doc(userId)
    .collection("files")
    .doc(docId)
    .get();

  const downloadUrl = firebaseRef.data()?.downloadUrl;
  if (!downloadUrl) throw new Error("Download URL not found");

  const response = await fetch(downloadUrl);
  const data = await response.blob();

  // Load and split the PDF into smaller chunks
  const loader = new PDFLoader(data);
  const docs = await loader.load();

  // Configure the text splitter for larger documents
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 10,
    separators: ["\n\n", "\n", ".", "!", "?", " ", ""],
  });

  const splitDocs = await textSplitter.splitDocuments(docs);

  // Batch process documents if they're too large
  const BATCH_SIZE = 20;
  const processedDocs = [];
  
  for (let i = 0; i < splitDocs.length; i += BATCH_SIZE) {
    const batch = splitDocs.slice(i, i + BATCH_SIZE);
    processedDocs.push(...batch);
    
    // Add a small delay between batches to prevent timeouts
    if (i + BATCH_SIZE < splitDocs.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return processedDocs;
};

async function namespaceExists(
  index: Index<RecordMetadata>,
  namespace: string
) {
  if (namespace === null) throw new Error("No namespace value provided.");
  const { namespaces } = await index.describeIndexStats();
  return namespaces?.[namespace] !== undefined;
}

export async function generateEmbeddingsInPineconeVectorStore(docId: string) {
  console.log("--- Generating embeddings... ---");
  const embeddings = new OpenAIEmbeddings({
    batchSize: 512, // Increase batch size for OpenAI embeddings
    maxConcurrency: 5 // Limit concurrent requests
  });

  const index = await pineconeClient.index(indexName);
  const namespaceAlreadyExists = await namespaceExists(index, docId);

  if (!namespaceAlreadyExists) {
    const splitDocs = await generateDocs(docId);
    
    // Configure batch processing
    const BATCH_SIZE = 20; // Reduced from 100
    const CONCURRENT_BATCHES = 3; // Reduced from 20
    const limit = pLimit(CONCURRENT_BATCHES);
    
    // Process documents in parallel batches
    const batches = [];
    for (let i = 0; i < splitDocs.length; i += BATCH_SIZE) {
      const batch = splitDocs.slice(i, i + BATCH_SIZE);
      
      // Add each batch operation to our queue
      batches.push(
        limit(async () => {
          console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(splitDocs.length / BATCH_SIZE)}`);
          
          await PineconeStore.fromDocuments(batch, embeddings, {
            pineconeIndex: index,
            namespace: docId,
            textKey: 'text',
          });
          
          // Small delay between batches to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        })
      );
    }

    // Wait for all batches to complete
    await Promise.all(batches);

    console.log("--- All embeddings generated successfully ---");

    return new PineconeStore(embeddings, {
      pineconeIndex: index,
      namespace: docId,
    });
  }

  return PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
    namespace: docId,
  });
}

const generateLangchainCompletion = async (docId: string, question: string) => {
  let pineconeVectorStore;

  pineconeVectorStore = await generateEmbeddingsInPineconeVectorStore(docId);
  if (!pineconeVectorStore) {
    throw new Error("Pinecone vector store not found");
  }

  // Create a retriever to search through the vector store
  console.log("--- Creating a retriever... ---");
  const retriever = pineconeVectorStore.asRetriever();

  // Fetch the chat history from the database
  const chatHistory = await fetchMessagesFromDB(docId);

  // Define a prompt template for generating search queries based on conversation history
  console.log("--- Defining a prompt template... ---");
  const historyAwarePrompt = ChatPromptTemplate.fromMessages([
    ...chatHistory, // Insert the actual chat history here

    ["user", "{input}"],
    [
      "user",
      "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
    ],
  ]);

  // Create a history-aware retriever chain that uses the model, retriever, and prompt
  console.log("--- Creating a history-aware retriever chain... ---");
  const historyAwareRetrieverChain = await createHistoryAwareRetriever({
    llm: model,
    retriever,
    rephrasePrompt: historyAwarePrompt,
  });

  // Define a prompt template for answering questions based on retrieved context
  console.log("--- Defining a prompt template for answering questions... ---");
  const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Answer the user's questions based on the below context:\n\n{context}",
    ],

    ...chatHistory, // Insert the actual chat history here

    ["user", "{input}"],
  ]);

  // Create a chain to combine the retrieved documents into a coherent response
  console.log("--- Creating a document combining chain... ---");
  const historyAwareCombineDocsChain = await createStuffDocumentsChain({
    llm: model,
    prompt: historyAwareRetrievalPrompt,
  });

  // Create the main retrieval chain that combines the history-aware retriever and document combining chains
  console.log("--- Creating the main retrieval chain... ---");
  const conversationalRetrievalChain = await createRetrievalChain({
    retriever: historyAwareRetrieverChain,
    combineDocsChain: historyAwareCombineDocsChain,
  });

  console.log("--- Running the chain with a sample conversation... ---");
  const reply = await conversationalRetrievalChain.invoke({
    chat_history: chatHistory,
    input: question,
  });

  // Print the result to the console
  console.log(reply.answer);
  return reply.answer;
};

// Export the model and the run function
export { model, generateLangchainCompletion };