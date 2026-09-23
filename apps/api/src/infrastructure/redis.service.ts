import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

  async publish(stream: string, message: Record<string, string>) {
    return this.client.xadd(stream, "*", ...Object.entries(message).flat());
  }

  async read(stream: string, group: string, consumer: string, count = 10) {
    await this.client.xgroup("CREATE", stream, group, "$", "MKSTREAM").catch(() => undefined);
    return this.client.xreadgroup("GROUP", group, consumer, "COUNT", count, "BLOCK", 1000, "STREAMS", stream, ">");
  }

  async onModuleDestroy() { await this.client.quit(); }
}