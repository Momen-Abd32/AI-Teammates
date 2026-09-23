import { Injectable, UnauthorizedException } from "@nestjs/common";

export type TenantContext = {
  companyId: string;
  employeeId: string;
};

@Injectable()
export class TenantContextService {
  validate(input: Partial<TenantContext>): TenantContext {
    if (!input.companyId || !input.employeeId) {
      throw new UnauthorizedException("Company and employee context are required");
    }
    return { companyId: input.companyId, employeeId: input.employeeId };
  }
}
