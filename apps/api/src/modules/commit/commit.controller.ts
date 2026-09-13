import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import {
  decideCommitSchema,
  offerSplitsSchema,
  supersedeCommitSchema,
} from "@scp/domain";
import type {
  DecideCommitInput,
  OfferSplitsInput,
  SupersedeCommitInput,
} from "@scp/domain";
import { CurrentUser } from "../../common/current-user";
import { ZodPipe } from "../../common/zod.pipe";
import type { SessionClaims } from "../auth/token";
import { CommitService } from "./commit.service";

@Controller()
export class CommitController {
  constructor(@Inject(CommitService) private readonly commits: CommitService) {}

  @Get("commits")
  inbox() {
    return this.commits.inbox();
  }

  @Get("forecasts/:forecastId/commits")
  forForecast(@Param("forecastId") forecastId: string) {
    return this.commits.forForecast(forecastId.toUpperCase());
  }

  @Post("forecasts/:forecastId/commits")
  offer(
    @Param("forecastId") forecastId: string,
    @Body(new ZodPipe(offerSplitsSchema)) body: OfferSplitsInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.commits.offer(forecastId.toUpperCase(), body, user);
  }

  @Post("commits/:commitId/versions")
  supersede(
    @Param("commitId") commitId: string,
    @Body(new ZodPipe(supersedeCommitSchema)) body: SupersedeCommitInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.commits.supersede(commitId.toUpperCase(), body, user);
  }

  @Post("commits/:commitId/decision")
  decide(
    @Param("commitId") commitId: string,
    @Body(new ZodPipe(decideCommitSchema)) body: DecideCommitInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.commits.decide(commitId.toUpperCase(), body, user);
  }
}
