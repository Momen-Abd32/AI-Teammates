import {BadRequestException,ForbiddenException,Injectable}from "@nestjs/common";
import {randomUUID}from "crypto";
import {Memory,MemoryScope}from "../domain";
import {MemoryRepository}from "../repositories/memory.repository";
import {OrganizationService}from "../organization/organization.service";

@Injectable()
export class MemoryService{
 constructor(private repo:MemoryRepository,private org:OrganizationService){}

 private async assertOwner(companyId:string,employeeId:string,agentId:string){
   const agents=await this.org.agents(companyId);
   const agent=agents.find(x=>x.id===agentId);
   if(!agent || agent.employeeId!==employeeId) throw new ForbiddenException("Agent memory access denied");
   return agent;
 }

 async create(input:Omit<Memory,"id">,employeeId:string){
   await this.assertOwner(input.companyId,employeeId,input.agentId);
   if(!input.content?.trim()) throw new BadRequestException("Memory content is required");
   if(!["PRIVATE","PROJECT","TEAM","COMPANY"].includes(input.scope)) throw new BadRequestException("Invalid memory scope");
   return this.repo.save({...input,id:randomUUID()});
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

 async semanticSearch(companyId:string,employeeId:string,agentId:string,embedding:number[],limit=5){
   await this.assertOwner(companyId,employeeId,agentId);
   if(embedding.length!==1536) throw new BadRequestException("Embedding must contain 1536 dimensions");
   return this.repo.semanticSearch(agentId,embedding,Math.min(Math.max(limit,1),50));
 }
}