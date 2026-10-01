import { Controller, Get, Inject, Post } from "@nestjs/common";
import { WritebackService } from "./erp-writeback.service";

@Controller("writebacks")
export class WritebackController {
  constructor(@Inject(WritebackService) private readonly writebacks: WritebackService) {}

  @Get()
  list() {
    return this.writebacks.list();
  }

  @Post("process")
  process() {
    return this.writebacks.processPending();
  }
}
