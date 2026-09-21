import { Module } from "@nestjs/common";
import { ErpWritebackModule } from "../erp-writeback/erp-writeback.module";
import { PurchaseOrderController } from "./purchase-order.controller";
import { PurchaseOrderService } from "./purchase-order.service";

/** Phase 5. PO/Ack and accepted-commit → PO conversion. */
@Module({
  imports: [ErpWritebackModule],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
