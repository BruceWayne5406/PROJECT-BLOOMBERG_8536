import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { publishForecastSchema, republishForecastSchema } from "@scp/domain";
import { CurrentUser } from "../../common/current-user";
import { ZodPipe } from "../../common/zod.pipe";
import type { SessionClaims } from "../auth/token";
import { ForecastService } from "./forecast.service";
import type { PublishForecastInput, RepublishForecastInput } from "@scp/domain";

@Controller("forecasts")
export class ForecastController {
  constructor(@Inject(ForecastService) private readonly forecasts: ForecastService) {}

  @Get()
  list() {
    return this.forecasts.list();
  }

  @Get(":forecastId")
  get(@Param("forecastId") forecastId: string) {
    return this.forecasts.get(forecastId.toUpperCase());
  }

  @Post()
  publish(
    @Body(new ZodPipe(publishForecastSchema)) body: PublishForecastInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.forecasts.publish(body, user);
  }

  @Post(":forecastId/versions")
  republish(
    @Param("forecastId") forecastId: string,
    @Body(new ZodPipe(republishForecastSchema)) body: RepublishForecastInput,
    @CurrentUser() user: SessionClaims,
  ) {
    return this.forecasts.republish(forecastId.toUpperCase(), body, user);
  }

  @Post(":forecastId/publish")
  publishDraft(@Param("forecastId") forecastId: string, @CurrentUser() user: SessionClaims) {
    return this.forecasts.publishDraft(forecastId.toUpperCase(), user);
  }
}
