'use server'
import { auth } from '@clerk/nextjs/server';
import { generateEmbeddingsInPineconeVectorStore } from './../lib/langchain';
import { revalidatePath } from 'next/cache';

export async function generateEmbeddings(docId: string) {
  
  // Prevent unauthenticated users from accessing this route
  auth.protect();

  // Turn PDF into embeddings like [0.0123, 0.4567, 0.8901...]
  await generateEmbeddingsInPineconeVectorStore(docId);


  revalidatePath('/dashboard');

  return {completed: true};

}





