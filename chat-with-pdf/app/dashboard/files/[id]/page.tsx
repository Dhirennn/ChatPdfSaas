import Chat from "@/components/Chat";
import PdfView from "@/components/PdfView";
import { adminDb } from "@/firebaseAdmin";
import { auth } from "@clerk/nextjs/server";

// Fix: Remove static typing of params in the function signature and await it
async function ChatToFilePage({ params }: { params: Promise<{ id: string }> }) {
  // Await `params` to get its properties
  const { id } = await params;

  // Authenticate the user
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated.");
  }

  // Fetch the file from the database
  const ref = await adminDb
    .collection("users")
    .doc(userId)
    .collection("files")
    .doc(id)
    .get();

  if (!ref.exists) {
    throw new Error("File not found.");
  }

  const url = ref.data()?.downloadUrl;

  return (
    <div className="grid lg:grid-cols-5 h-full overflow-hidden">
      {/* Right */}
      <div className="col-span-5 lg:col-span-2 overflow-y-auto">
        {/* Chat */}
        <Chat id={id} />
      </div>

      {/* Left */}
      <div className="col-span-5 lg:col-span-3 bg-gray-100 border-r-2 lg:border-indigo-600 lg:-order-1 overflow-auto">
        {/* PDFView */}
        <PdfView url={url} />
      </div>
    </div>
  );
}

export default ChatToFilePage;
