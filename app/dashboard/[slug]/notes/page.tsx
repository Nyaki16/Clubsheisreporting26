import { NotesContent } from "./notes-content";

export default async function NotesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NotesContent slug={slug} />;
}
