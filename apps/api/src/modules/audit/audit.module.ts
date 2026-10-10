import { Module } from "@nestjs/common";

/** Cross-cutting. Every write records actor_id + timestamp + reason_code. */
@Module({})
export class AuditModule {}
