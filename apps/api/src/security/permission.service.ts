import { ForbiddenException, Injectable } from "@nestjs/common";

export type AccessContext = {
  companyId: string;
  employeeId: string;
  agentId: string;
  projectId?: string;
};

@Injectable()
export class PermissionService {
  private readonly permissions = new Map<string, Set<string>>();

  grant(agentId: string, permission: string) {
    const current = this.permissions.get(agentId) ?? new Set<string>();
    current.add(permission);
    this.permissions.set(agentId, current);
  }

  assert(context: AccessContext, permission: string) {
    const allowed = this.permissions.get(context.agentId)?.has(permission);
    if (!allowed) {
      throw new ForbiddenException(`Agent is not allowed to perform: ${permission}`);
    }
    return true;
  }
}
