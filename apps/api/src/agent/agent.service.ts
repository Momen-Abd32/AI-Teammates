import { Injectable, BadGatewayException } from "@nestjs/common";

@Injectable()
export class AgentService {
  getDemoAgent() {
    return {
      id: "agent-demo",
      employeeId: "employee-demo",
      companyId: "company-demo",
      role: "full_stack_developer",
      permissions: ["project.read", "task.read", "memory.write"],
    };
  }

  async chat(input: {
    agentId: string;
    employeeId: string;
    companyId: string;
    role?: string;
    message: string;
  }) {
    const baseUrl = process.env.AGENT_SERVICE_URL ?? "http://localhost:8000";
    const response = await fetch(baseUrl + "/v1/agents/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) throw new BadGatewayException("Agent service request failed");
    return response.json();
  }
}
