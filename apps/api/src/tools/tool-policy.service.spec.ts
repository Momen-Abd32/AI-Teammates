import{ForbiddenException}from"@nestjs/common";
import{ToolPolicyService}from"./tool-policy.service";

describe("ToolPolicyService",()=>{
 const registry={get:(name:string)=>name==="terminal.execute"?{name,permission:"terminal.execute",requiresApproval:true}:{name,permission:"repository.read",requiresApproval:false}};
 const org={agents:async()=>[{id:"agent-1",employeeId:"employee-1",permissions:["terminal.execute","repository.read"]}]};
 const permissions={assertWithPermissions:(_ctx:any,permission:string,granted:string[])=>{if(!granted.includes(permission))throw new Error("missing");}};
 const service=new ToolPolicyService(registry as any,org as any,permissions as any);

 it("requires approval for sensitive terminal execution",async()=>{
  await expect(service.decide({companyId:"company-1",employeeId:"employee-1",agentId:"agent-1",name:"terminal.execute",arguments:{}})).resolves.toMatchObject({allowed:true,requiresApproval:true});
 });
 it("rejects cross-employee agent access",async()=>{
  await expect(service.decide({companyId:"company-1",employeeId:"employee-2",agentId:"agent-1",name:"repository.read",arguments:{}})).rejects.toBeInstanceOf(ForbiddenException);
 });
});
