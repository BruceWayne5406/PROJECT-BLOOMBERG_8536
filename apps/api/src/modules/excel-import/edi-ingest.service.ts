import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  acknowledgePoSchema,
  convertCommitSchema,
  proposeChangeOrderSchema,
} from "@scp/domain";
import type { SessionClaims } from "../auth/token";
import { ChangeOrderService } from "../change-order/change-order.service";
import { PurchaseOrderService } from "../purchase-order/purchase-order.service";

const ediMessageSchema = z.object({
  transactionSet: z.enum(["850", "855", "860"]),
  payload: z.record(z.unknown()),
});

@Injectable()
export class EdiIngestService {
  constructor(
    @Inject(PurchaseOrderService) private readonly pos: PurchaseOrderService,
    @Inject(ChangeOrderService) private readonly changes: ChangeOrderService,
  ) {}

  async ingest(body: unknown, user: SessionClaims) {
    const message = ediMessageSchema.parse(body);
    if (message.transactionSet === "850") {
      const sourceCommitId = String(message.payload.sourceCommitId ?? "");
      if (!sourceCommitId) {
        throw new BadRequestException(
          "850 must reference sourceCommitId. POs are converted from accepted commits, never re-keyed.",
        );
      }
      const parsed = convertCommitSchema.parse({
        poNumber: message.payload.poNumber,
        price: message.payload.price ?? null,
      });
      const row = await this.pos.convert(sourceCommitId, parsed, user);
      return { channel: "edi", transactionSet: "850", id: row.id };
    }
    if (message.transactionSet === "855") {
      const purchaseOrderId = String(message.payload.purchaseOrderId ?? "");
      if (!purchaseOrderId) throw new BadRequestException("855 needs purchaseOrderId");
      const parsed = acknowledgePoSchema.parse({
        ackStatus: message.payload.ackStatus ?? "accepted",
        promiseQty: message.payload.promiseQty,
        promiseDate: message.payload.promiseDate,
        changeReason: message.payload.changeReason ?? null,
      });
      const row = await this.pos.acknowledge(purchaseOrderId, parsed, user);
      return { channel: "edi", transactionSet: "855", id: row.id };
    }
    const purchaseOrderId = String(message.payload.purchaseOrderId ?? "");
    if (!purchaseOrderId) throw new BadRequestException("860 needs purchaseOrderId");
    const parsed = proposeChangeOrderSchema.parse({
      proposedQty: message.payload.proposedQty ?? null,
      proposedDate: message.payload.proposedDate ?? null,
      reasonCode: message.payload.reasonCode,
      msaClauseRef: message.payload.msaClauseRef ?? null,
    });
    const row = await this.changes.propose(purchaseOrderId, parsed, user);
    return { channel: "edi", transactionSet: "860", id: row.changeOrderId };
  }
}
