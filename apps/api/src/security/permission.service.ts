import { ForbiddenException, Injectable } from "@nestjs/common";

export type AccessContext = {
  companyId: string;
  employeeId: string;
  agentId: string;
  projectId?: string;
};

@Injectable()
export class PermissionService {
  grant(agentId:string, permission:string) {
    // Kept only for tests/local bootstrap. Production authorization comes from
    // the agent record returned by the database and is checked on every action.
    return { agentId, permission };
  }

  assert(ctx:AccessContext, permission:string) {
    if(!ctx.companyId || !ctx.employeeId || !ctx.agentId) {
      throw new ForbiddenException("Tenant context required");
    }
    throw new ForbiddenException("Permission set was not supplied");
  }

  assertWithPermissions(ctx:AccessContext, permission:string, permissions:unknown) {
    if(!ctx.companyId || !ctx.employeeId || !ctx.agentId) {
      throw new ForbiddenException("Tenant context required");
    }
    const allowed = Array.isArray(permissions) && permissions.includes(permission);
    if(!allowed) throw new ForbiddenException("Permission denied");
    return true;
  }
}
