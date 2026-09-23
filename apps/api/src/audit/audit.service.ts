import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";

export type AuditEvent = {
  id: string;
  companyId: string;
  actorId?: string;
  agentId?: string;
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

@Injectable()
export class AuditService {
  private readonly events: AuditEvent[] = [];

  record(input: Omit<AuditEvent, "id" | "createdAt">) {
    const event = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    this.events.push(event);
    return event;
  }

  list(companyId: string) {
    return this.events.filter(e => e.companyId === companyId);
  }
}
