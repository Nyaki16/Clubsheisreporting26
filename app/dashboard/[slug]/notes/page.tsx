import { Suspense } from "react";
import { NotesContent } from "./notes-content";

export default async function NotesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading strategy notes...</div>}>
      <NotesContent slug={slug} />
    </Suspense>
  );
}
