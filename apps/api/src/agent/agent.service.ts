import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { PermissionService } from "../security/permission.service";
import { AuditService } from "../audit/audit.service";
import { OrganizationService } from "../organization/organization.service";
import { MemoryService } from "../memory/memory.service";
import { MemoryLearningService } from "../memory/memory-learning.service";

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private permissions:PermissionService,
    private audit:AuditService,
    private org:OrganizationService,
    private memory:MemoryService,
    private learning:MemoryLearningService,
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

  async chat(input:{agentId:string;employeeId:string;companyId:string;role?:string;message:string}) {
    const agent = await this.getAgent(input.agentId,input.companyId);
    if(agent.employeeId !== input.employeeId) throw new BadGatewayException("Agent does not belong to employee");

    this.permissions.assertWithPermissions(
      {companyId:input.companyId,employeeId:input.employeeId,agentId:input.agentId},
      "agent.chat",
      agent.permissions,
    );

    this.audit.record({companyId:input.companyId,actorId:input.employeeId,agentId:input.agentId,action:"agent.chat",resource:input.agentId});

    const memories = await this.memory.semanticSearch(
      input.companyId,
      input.employeeId,
      input.agentId,
      input.message,
      8,
    );

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
      }),
    });

    if(!response.ok) throw new BadGatewayException("Agent service request failed");
    const result = await response.json() as {response?:string};
    if (result.response) void this.learnFromConversation(input,result.response);
    return result;
  }
}
