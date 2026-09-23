import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Memory, MemoryScope } from "../domain";
import { OrganizationService } from "../organization/organization.service";
import { MemoryRepository } from "../repositories/memory.repository";
import { MemoryEmbeddingService } from "./embedding.service";

const FORBIDDEN_MEMORY_TERMS = ["password","api key","apikey","secret","private key","credit card"];

@Injectable()
export class MemoryService {
  constructor(
    private readonly repo: MemoryRepository,
    private readonly org: OrganizationService,
    private readonly embeddings: MemoryEmbeddingService,
  ) {}

  private async assertOwner(companyId:string,employeeId:string,agentId:string){
    const agents=await this.org.agents(companyId);
    const agent=agents.find(x=>x.id===agentId);
    if(!agent || agent.employeeId!==employeeId) throw new ForbiddenException("Agent memory access denied");
    return agent;
  }

  private assertSafeContent(content:string){
    const normalized=content.toLowerCase();
    if(FORBIDDEN_MEMORY_TERMS.some(term=>normalized.includes(term))){
      throw new BadRequestException("Memory contains restricted credential or secret data");
    }
  }

  async create(input:Omit<Memory,"id">,employeeId:string){
    await this.assertOwner(input.companyId,employeeId,input.agentId);
    if(!input.content?.trim()) throw new BadRequestException("Memory content is required");
    if(!["PRIVATE","PROJECT","TEAM","COMPANY"].includes(input.scope)) throw new BadRequestException("Invalid memory scope");
    this.assertSafeContent(input.content);
    const embedding=await this.embeddings.embed(input.content);
    return this.repo.save({...input,id:randomUUID()},embedding);
  }

  async list(companyId:string,employeeId:string,agentId:string,scope?:MemoryScope){
    await this.assertOwner(companyId,employeeId,agentId);
    const rows=await this.repo.findByAgent(agentId);
    return rows.filter(x=>!scope || x.scope===scope);
  }

  async delete(companyId:string,employeeId:string,agentId:string,id:string){
    await this.assertOwner(companyId,employeeId,agentId);
    return this.repo.delete(agentId,id);
  }

  async semanticSearch(companyId:string,employeeId:string,agentId:string,query:string,limit=5,scope?:MemoryScope){
    await this.assertOwner(companyId,employeeId,agentId);
    if(!query?.trim()) throw new BadRequestException("Search query is required");
    const embedding=await this.embeddings.embed(query);
    return this.repo.semanticSearch(agentId,embedding,Math.min(Math.max(limit,1),50),scope);
  }
}