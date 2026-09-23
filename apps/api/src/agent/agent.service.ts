import { BadGatewayException, Injectable } from "@nestjs/common";
import { PermissionService } from "../security/permission.service";
import { AuditService } from "../audit/audit.service";
import { OrganizationService } from "../organization/organization.service";

@Injectable()
export class AgentService {
  constructor(
    private permissions:PermissionService,
    private audit:AuditService,
    private org:OrganizationService,
  ) {}

  async getAgent(agentId:string, companyId:string) {
    const agents = await this.org.agents(companyId);
    const agent = agents.find(x => x.id === agentId);
    if(!agent) throw new BadGatewayException("Agent not found in company");
    return agent;
  }

  async chat(input:{
    agentId:string;
    employeeId:string;
    companyId:string;
    role?:string;
    message:string;
  }) {
    const agent = await this.getAgent(input.agentId,input.companyId);
    if(agent.employeeId !== input.employeeId) {
      throw new BadGatewayException("Agent does not belong to employee");
    }

    this.permissions.assertWithPermissions(
      {companyId:input.companyId,employeeId:input.employeeId,agentId:input.agentId},
      "agent.chat",
      agent.permissions,
    );

    this.audit.record({
      companyId:input.companyId,
      actorId:input.employeeId,
      agentId:input.agentId,
      action:"agent.chat",
      resource:input.agentId,
    });

    const baseUrl = process.env.AGENT_SERVICE_URL ?? "http://localhost:8000";
    const response = await fetch(baseUrl + "/v1/agents/respond", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        ...input,
        role:agent.role,
        permissions:agent.permissions ?? [],
        instructions:agent.systemInstructions ?? "",
      }),
    });

    if(!response.ok) {
      throw new BadGatewayException("Agent service request failed");
    }
    return response.json();
  }
}
