import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApprovalService } from "./approval.service";

@Controller("approvals")
export class ApprovalController {
  constructor(private readonly approvals: ApprovalService) {}

  @Get("company/:companyId")
  list(@Param("companyId") companyId: string) {
    return this.approvals.list(companyId);
  }

  @Post()
  request(@Body() body: {
    companyId: string;
    agentId: string;
    taskId?: string;
    action: string;
    reason: string;
  }) {
    return this.approvals.request(body);
  }

  @Patch(":id")
  decide(
    @Param("id") id: string,
    @Body() body: { decidedBy: string; status: "APPROVED" | "REJECTED" },
  ) {
    return this.approvals.decide(id, body.decidedBy, body.status);
  }
}
