import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createDb, createPool, loadRootEnv, type Database } from "@scp/db";
import type { Pool } from "pg";

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool: Pool;
  readonly db: Database;

  constructor() {
    loadRootEnv();
    this.pool = createPool();
    this.db = createDb(this.pool);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
