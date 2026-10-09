import { Module } from "@nestjs/common";
import { WritebackController } from "./erp-writeback.controller";
import { WritebackService } from "./erp-writeback.service";

/** Phase 8. ERP/IBP write-back hooks (stub adapter; this app is not the ERP). */
@Module({
  controllers: [WritebackController],
  providers: [WritebackService],
  exports: [WritebackService],
})
export class ErpWritebackModule {}
