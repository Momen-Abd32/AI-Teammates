import { BadRequestException,ForbiddenException,Injectable } from "@nestjs/common";
import { ConversationRepository } from "./conversation.repository";
import { OrganizationService } from "../organization/organization.service";

@Injectable()
export class ConversationService {
  constructor(private readonly repo:ConversationRepository,private readonly org:OrganizationService) {}

  private async assertAgent(companyId:string,employeeId:string,agentId:string){
    const agents=await this.org.agents(companyId);
    const agent=agents.find(x=>x.id===agentId);
    if(!agent || agent.employeeId!==employeeId) throw new ForbiddenException("Conversation agent access denied");
  }

  async create(companyId:string,employeeId:string,agentId:string,title?:string){
    await this.assertAgent(companyId,employeeId,agentId);
    return this.repo.create(companyId,employeeId,agentId,title?.trim() || "New conversation");
  }
  async list(companyId:string,employeeId:string){ return this.repo.list(companyId,employeeId); }
  async context(id:string,companyId:string,employeeId:string,limit=12){
    const conversation=await this.repo.findOwned(id,companyId,employeeId);
    if(!conversation) throw new ForbiddenException("Conversation access denied");
    return this.repo.messages(id,limit);
  }

  async messages(id:string,companyId:string,employeeId:string,limit=30){
    const conversation=await this.repo.findOwned(id,companyId,employeeId);
    if(!conversation) throw new ForbiddenException("Conversation access denied");
    return this.repo.messages(id,limit);
  }
  async updateTitle(id:string,companyId:string,employeeId:string,title:string){\n    const conversation=await this.repo.findOwned(id,companyId,employeeId);\n    if(!conversation) throw new ForbiddenException("Conversation access denied");\n    const clean=title.trim().replace(/\\s+/g," ").slice(0,80);\n    if(!clean) throw new BadRequestException("Conversation title is required");\n    return this.repo.updateTitle(id,clean);\n  }\n\n  async addMessage(id:string,companyId:string,employeeId:string,sender:"USER"|"AGENT"|"SYSTEM",content:string){
    if(!content?.trim()) throw new BadRequestException("Message content is required");
    const conversation=await this.repo.findOwned(id,companyId,employeeId);
    if(!conversation) throw new ForbiddenException("Conversation access denied");
    return this.repo.addMessage(id,sender,content.trim());
  }
}