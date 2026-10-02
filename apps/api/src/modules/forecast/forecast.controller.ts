import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { publishForecastSchema, republishForecastSchema } from "@scp/domain";
import { ActorId } from "../../common/actor";
import { ZodPipe } from "../../common/zod.pipe";
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
    @ActorId() actorId: string,
  ) {
    return this.forecasts.publish(body, actorId);
  }

  @Post(":forecastId/versions")
  republish(
    @Param("forecastId") forecastId: string,
    @Body(new ZodPipe(republishForecastSchema)) body: RepublishForecastInput,
    @ActorId() actorId: string,
  ) {
    return this.forecasts.republish(forecastId.toUpperCase(), body, actorId);
  }

  @Post(":forecastId/publish")
  publishDraft(@Param("forecastId") forecastId: string, @ActorId() actorId: string) {
    return this.forecasts.publishDraft(forecastId.toUpperCase(), actorId);
  }
}
