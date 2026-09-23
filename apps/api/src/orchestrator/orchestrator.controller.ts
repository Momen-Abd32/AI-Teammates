import{Body,Controller,Post}from"@nestjs/common";
import{CurrentUser}from"../auth/current-user.decorator";
import{OrchestratorService}from"./orchestrator.service";

@Controller("orchestrator")
export class OrchestratorController{
 constructor(private orchestrator:OrchestratorService){}
 @Post("dispatch")
 dispatch(@Body()b:{senderAgentId:string;receiverAgentId:string;title:string;description:string;projectId?:string},@CurrentUser()user:any){
  return this.orchestrator.dispatch({...b,companyId:user.companyId,employeeId:user.employeeId});
 }
}
