import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Memory, MemoryScope } from "../domain";
import { MemoryRepository } from "../repositories/memory.repository";

@Injectable()
export class MemoryService {
  constructor(private repo:MemoryRepository) {}

  async create(input:Omit<Memory,"id">) {
    if(!input.content?.trim()) throw new BadRequestException("Memory content is required");
    if(!["PRIVATE","PROJECT","TEAM","COMPANY"].includes(input.scope)) {
      throw new BadRequestException("Invalid memory scope");
    }
    return this.repo.save({...input,id:randomUUID()});
  }

  async list(agentId:string,scope?:MemoryScope) {
    const rows=await this.repo.findByAgent(agentId);
    return rows.filter(x=>!scope || x.scope===scope);
  }

  delete(agentId:string,id:string) {
    return this.repo.delete(agentId,id);
  }

  semanticSearch(agentId:string,embedding:number[],limit=5) {
    if(embedding.length !== 1536) throw new BadRequestException("Embedding must contain 1536 dimensions");
    return this.repo.semanticSearch(agentId,embedding,Math.min(Math.max(limit,1),50));
  }
}
