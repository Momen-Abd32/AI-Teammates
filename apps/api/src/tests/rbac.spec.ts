import {Reflector} from "@nestjs/core";
import {RolesGuard} from "../auth/roles.guard";
import {ROLES_KEY} from "../auth/roles.decorator";

describe("RBAC",()=>{
  it("allows a role listed by route metadata",()=>{
    const reflector:any={getAllAndOverride:jest.fn().mockReturnValue(["admin"])};
    const guard=new RolesGuard(reflector as Reflector);
    const context:any={getHandler:()=>({}),getClass:()=>({}),switchToHttp:()=>({getRequest:()=>({user:{role:"admin"}})})};
    expect(guard.canActivate(context)).toBe(true);
  });

  it("denies roles not listed by route metadata",()=>{
    const reflector:any={getAllAndOverride:jest.fn().mockReturnValue(["admin"])};
    const guard=new RolesGuard(reflector as Reflector);
    const context:any={getHandler:()=>({}),getClass:()=>({}),switchToHttp:()=>({getRequest:()=>({user:{role:"employee"}})})};
    expect(()=>guard.canActivate(context)).toThrow();
  });

  it("uses the shared roles metadata key",()=>expect(ROLES_KEY).toBe("roles"));
});
