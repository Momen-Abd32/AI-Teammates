import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Approval = {
  id: string;
  companyId: string;
  agentId: string;
  taskId?: string;
  action: string;
  reason: string;
  status: ApprovalStatus;
  decidedBy?: string;
};

@Injectable()
export class ApprovalService {
  private readonly approvals = new Map<string, Approval>();

  request(input: Omit<Approval, "id" | "status">) {
    const approval = { ...input, id: randomUUID(), status: "PENDING" as const };
    this.approvals.set(approval.id, approval);
    return approval;
  }

  list(companyId: string) {
    return [...this.approvals.values()].filter(a => a.companyId === companyId);
  }

  decide(id: string, decidedBy: string, status: "APPROVED" | "REJECTED") {
    const approval = this.approvals.get(id);
    if (!approval) throw new NotFoundException("Approval not found");
    approval.status = status;
    approval.decidedBy = decidedBy;
    return approval;
  }
}
