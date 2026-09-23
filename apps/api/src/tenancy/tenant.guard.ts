import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const companyId = request.headers["x-company-id"];
    const employeeId = request.headers["x-employee-id"];
    if (!companyId || !employeeId) throw new UnauthorizedException("Tenant context missing");
    request.tenant = { companyId, employeeId };
    return true;
  }
}
