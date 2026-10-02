import { Body, Controller, Inject, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user";
import type { SessionClaims } from "../auth/token";
import { EdiIngestService } from "./edi-ingest.service";

@Controller("edi")
export class EdiIngestController {
  constructor(@Inject(EdiIngestService) private readonly edi: EdiIngestService) {}

  @Post("ingest")
  ingest(@Body() body: unknown, @CurrentUser() user: SessionClaims) {
    return this.edi.ingest(body, user);
  }
}
