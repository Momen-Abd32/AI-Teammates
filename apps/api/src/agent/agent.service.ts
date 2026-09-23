import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { PermissionService } from "../security/permission.service";
import { AuditService } from "../audit/audit.service";
import { OrganizationService } from "../organization/organization.service";
import { MemoryService } from "../memory/memory.service";
import { MemoryLearningService } from "../memory/memory-learning.service";
import { ConversationService } from "../conversations/conversation.service";
import { ActivityEventService } from "../activity/activity.event.service";

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private permissions:PermissionService,
    private audit:AuditService,
    private org:OrganizationService,
    private memory:MemoryService,
    private learning:MemoryLearningService,
    private conversations:ConversationService,
    private activity:ActivityEventService,
  ) {}

  async getAgent(agentId:string, companyId:string) {
    const agents = await this.org.agents(companyId);
    const agent = agents.find(x => x.id === agentId);
    if(!agent) throw new BadGatewayException("Agent not found in company");
    return agent;
  }

  private async learnFromConversation(input:{agentId:string;employeeId:string;companyId:string;message:string}, response:string) {
    if (response.startsWith("[LLM_NOT_CONFIGURED]")) return;
    const candidate = this.learning.extract(input.message,response);
    if (!candidate) return;

    try {
      await this.memory.create({
        companyId:input.companyId,
        agentId:input.agentId,
        scope:candidate.scope,
        content:candidate.content,
      }, input.employeeId);
      this.audit.record({
        companyId:input.companyId,
        actorId:input.employeeId,
        agentId:input.agentId,
        action:"agent.memory.learned",
        resource:input.agentId,
      });
    } catch (error) {
      // Learning must never make an otherwise successful chat fail.
      this.logger.warn("Automatic memory learning skipped", error instanceof Error ? error.message : String(error));
    }
  }

  async chat(input:{agentId:string;employeeId:string;companyId:string;conversationId?:string;role?:string;message:string}) {
    const agent = await this.getAgent(input.agentId,input.companyId);
    if(agent.employeeId !== input.employeeId) throw new BadGatewayException("Agent does not belong to employee");

    this.permissions.assertWithPermissions(
      {companyId:input.companyId,employeeId:input.employeeId,agentId:input.agentId},
      "agent.chat",
      agent.permissions,
    );

    this.audit.record({companyId:input.companyId,actorId:input.employeeId,agentId:input.agentId,action:"agent.chat",resource:input.agentId});
    await this.activity.publish({type:"agent.started",companyId:input.companyId,employeeId:input.employeeId,agentId:input.agentId,conversationId:input.conversationId,message:"Agent started"});

    let conversationId=input.conversationId;
    if (conversationId) {
      const conversation=await this.conversations.context(conversationId,input.companyId,input.employeeId,12);
      if (conversation.length) {
        // Short-term context is attached below without bypassing tenant ownership.
      }
    } else {
      const created=await this.conversations.create(input.companyId,input.employeeId,input.agentId);
      conversationId=created.id;
    }
    await this.conversations.addMessage(conversationId,input.companyId,input.employeeId,"USER",input.message);
    const existingMessages=await this.conversations.context(conversationId,input.companyId,input.employeeId,2);
    if(existingMessages.length===1 && existingMessages[0].sender==="USER"){
      const title=input.message.trim().replace(/\s+/g," ").slice(0,60);
      await this.conversations.updateTitle(conversationId,input.companyId,input.employeeId,title || "New conversation");
    }
    const history=await this.conversations.context(conversationId,input.companyId,input.employeeId,12);

    const memories = await this.memory.semanticSearch(
      input.companyId,
      input.employeeId,
      input.agentId,
      input.message,
      8,
    );

    await this.activity.publish({type:"memory.retrieved",companyId:input.companyId,employeeId:input.employeeId,agentId:input.agentId,conversationId,message:`Retrieved ${memories.length} memories`});

    const baseUrl = process.env.AGENT_SERVICE_URL ?? "http://localhost:8000";
    const response = await fetch(baseUrl + "/v1/agents/respond", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        ...input,
        role:agent.role,
        permissions:agent.permissions ?? [],
        instructions:agent.systemInstructions ?? "",
        memories:memories.map(memory => ({scope:memory.scope,content:memory.content,score:memory.score})),
        conversationHistory:history.map(item => ({sender:item.sender,content:item.content})),
      }),
    });

    if(!response.ok){
      await this.activity.publish({type:"agent.failed",companyId:input.companyId,employeeId:input.employeeId,agentId:input.agentId,conversationId,message:"Agent service request failed"});
      throw new BadGatewayException("Agent service request failed");
    }
    const result = await response.json() as {response?:string};
    if (result.response) {
      await this.activity.publish({type:"agent.completed",companyId:input.companyId,employeeId:input.employeeId,agentId:input.agentId,conversationId,message:"Agent completed"});
      await this.conversations.addMessage(conversationId,input.companyId,input.employeeId,"AGENT",result.response);
      void this.learnFromConversation(input,result.response);
    }
    return result;
  }
}
