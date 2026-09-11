export function StatusChip({ status }: { status: string }) {
  return <span className={`chip chip-${status}`}>{status}</span>;
}

export function DemandChip({ demandType }: { demandType: string }) {
  return <span className={`chip chip-demand-${demandType}`}>{demandType}</span>;
}
