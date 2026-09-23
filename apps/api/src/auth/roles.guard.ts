import {CanActivate,ExecutionContext,ForbiddenException,Injectable} from "@nestjs/common";
import {Reflector} from "@nestjs/core";
import {ROLES_KEY} from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
 constructor(private reflector:Reflector){}
 canActivate(context:ExecutionContext){
   const roles=this.reflector.getAllAndOverride<string[]>(ROLES_KEY,[context.getHandler(),context.getClass()]);
   if(!roles?.length) return true;
   const user=context.switchToHttp().getRequest<any>().user;
   if(!user || !roles.includes(user.role)) throw new ForbiddenException("Role not allowed");
   return true;
 }
}