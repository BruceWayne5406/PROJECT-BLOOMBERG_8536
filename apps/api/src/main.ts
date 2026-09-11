import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadRootEnv } from "@scp/db";

loadRootEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" });
  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  console.log(`SCP API (phase 2) listening on ${port}`);
}

bootstrap();
