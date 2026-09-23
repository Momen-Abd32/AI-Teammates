import { Injectable, BadGatewayException } from "@nestjs/common";

@Injectable()
export class AgentService {
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
      body: JSON.stringify({
        agent_id: input.agentId,
        employee_id: input.employeeId,
        company_id: input.companyId,
        role: input.role ?? "software_engineer",
        message: input.message,
      }),
    });

    if (!response.ok) {
      throw new BadGatewayException("Agent service request failed");
    }

    return response.json();
  }
}
