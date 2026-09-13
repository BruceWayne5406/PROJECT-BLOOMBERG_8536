import { Module } from "@nestjs/common";
import { ErpWritebackModule } from "../erp-writeback/erp-writeback.module";
import { ChangeOrderController } from "./change-order.controller";
import { ChangeOrderService } from "./change-order.service";

/** Phase 6. Dual-acceptance ChangeOrder; reason_code required after firm fence. */
@Module({
  imports: [ErpWritebackModule],
  controllers: [ChangeOrderController],
  providers: [ChangeOrderService],
  exports: [ChangeOrderService],
})
export class ChangeOrderModule {}
