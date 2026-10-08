import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { acknowledgeExceptionSchema } from "@scp/domain";
import type { AcknowledgeExceptionInput } from "@scp/domain";
import { CurrentUser } from "../../common/current-user";
import { ZodPipe } from "../../common/zod.pipe";
import type { SessionClaims } from "../auth/token";
import { ExceptionService } from "./exception.service";

@Controller("exceptions")
export class ExceptionController {
  constructor(@Inject(ExceptionService) private readonly exceptions: ExceptionService) {}

  @Get()
  list() {
    return this.exceptions.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.exceptions.get(id);
  }

  @Post("scan")
  scan() {
    return this.exceptions.scan();
  }

  @Post(":id/acknowledge")
  acknowledge(
    @Param("id") id: string,
    @Body(new ZodPipe(acknowledgeExceptionSchema)) body: AcknowledgeExceptionInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.exceptions.acknowledge(id, body, user);
  }
}
