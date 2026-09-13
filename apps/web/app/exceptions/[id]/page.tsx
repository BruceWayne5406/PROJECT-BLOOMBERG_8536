import { ExceptionDetail } from "../exceptions-board";

export default async function ExceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="page page-wide">
      <p className="kicker">Phase 4 / 9 · exception record</p>
      <h1>Exception</h1>
      <ExceptionDetail id={id} />
    </main>
  );
}
