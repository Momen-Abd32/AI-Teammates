import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Memory, MemoryScope } from "../domain";

@Injectable()
export class MemoryService {
  private readonly memories = new Map<string, Memory>();

  create(input: Omit<Memory, "id">) {
    const memory: Memory = { ...input, id: randomUUID() };
    this.memories.set(memory.id, memory);
    return memory;
  }

  list(agentId: string, scope?: MemoryScope) {
    return [...this.memories.values()].filter(
      (memory) => memory.agentId === agentId && (!scope || memory.scope === scope),
    );
  }

  delete(agentId: string, id: string) {
    const memory = this.memories.get(id);
    if (!memory || memory.agentId !== agentId) return false;
    return this.memories.delete(id);
  }
}
