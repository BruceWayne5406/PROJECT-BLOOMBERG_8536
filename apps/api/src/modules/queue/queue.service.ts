import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { WritebackService } from "../erp-writeback/erp-writeback.service";
import { ExceptionService } from "../exception/exception.service";

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(QueueService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private worker: { close: () => Promise<void> } | null = null;

  constructor(
    @Inject(ExceptionService) private readonly exceptions: ExceptionService,
    @Inject(WritebackService) private readonly writebacks: WritebackService,
  ) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const { Queue, Worker } = await import("bullmq");
        const { default: IORedis } = await import("ioredis");
        const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
        const queue = new Queue("scp-jobs", { connection });
        this.worker = new Worker(
          "scp-jobs",
          async (job) => {
            if (job.name === "scan-exceptions") return this.exceptions.scan();
            if (job.name === "process-writebacks") return this.writebacks.processPending();
            return null;
          },
          { connection },
        );
        this.timer = setInterval(() => {
          queue.add("scan-exceptions", {}).catch((err) => this.log.warn(String(err)));
          queue.add("process-writebacks", {}).catch((err) => this.log.warn(String(err)));
        }, 60_000);
        this.timer.unref();
        this.log.log("BullMQ workers online; SLA/write-back scan every 60s");
        return;
      } catch (err) {
        this.log.warn(
          `Redis/BullMQ not ready (${(err as Error).message}). Falling back to in-process scan.`,
        );
      }
    }
    this.timer = setInterval(() => {
      this.exceptions.scan().catch((err) => this.log.warn(String(err)));
      this.writebacks.processPending().catch((err) => this.log.warn(String(err)));
    }, 60_000);
    this.timer.unref();
    this.log.log("In-process SLA scan scheduled every 60s (silence is never acceptance)");
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.worker) await this.worker.close();
  }
}
