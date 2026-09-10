import type { ForecastCommitInput, IngestionPort, IngestionRow } from "@scp/domain";

/**
 * Phase 10 (EDI) and Phase 7 (Excel) both implement this port.
 * Once rows are parsed they share the ForecastCommit / PO pipeline — no EDI special-casing.
 */
export type ParsedCommitRow = ForecastCommitInput;

export class UnimplementedIngestionPort implements IngestionPort {
  ingest(_rows: IngestionRow[], _actorId: string): Promise<void> {
    throw new Error("IngestionPort is not implemented until Phase 7 (Excel) / Phase 10 (EDI)");
  }
}
