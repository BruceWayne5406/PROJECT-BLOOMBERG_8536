export function StatusChip({ status }: { status: string }) {
  return <span className={`chip chip-${status}`}>{status}</span>;
}

export function DemandChip({ demandType }: { demandType: string }) {
  return <span className={`chip chip-demand-${demandType}`}>{demandType}</span>;
}

export function GradeChip({
  grade,
  binding,
}: {
  grade: string | null;
  binding?: boolean;
}) {
  if (!grade) return <span className="chip chip-superseded">none</span>;
  const cls = binding ? "chip-frozen" : `chip-${grade}`;
  return (
    <span className={`chip ${cls}`}>
      {grade}
      {binding ? " · binding" : grade === "planning" ? " · planning only" : ""}
    </span>
  );
}
