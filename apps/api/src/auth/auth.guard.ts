import {CanActivate,ExecutionContext,Injectable,UnauthorizedException} from "@nestjs/common";
import {AuthService} from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth:AuthService){}
  canActivate(context:ExecutionContext){
    const req=context.switchToHttp().getRequest<any>();
    const path=req.path ?? "";
    if(path.endsWith("/health") || path.includes("/auth/")) return true;

    const header=req.headers?.authorization;
    if(!header?.startsWith("Bearer ")) throw new UnauthorizedException("Bearer token required");
    const user=this.auth.validate(header.slice(7));
    req.user=user;

    const requestedCompany=req.params?.companyId ?? req.body?.companyId;
    if(requestedCompany && requestedCompany!==user.companyId) {
      throw new UnauthorizedException("Tenant mismatch");
    }

    const requestedEmployee=req.body?.employeeId;
    if(requestedEmployee && requestedEmployee!==user.employeeId) {
      throw new UnauthorizedException("Employee context mismatch");
    }

    return true;
  }
}