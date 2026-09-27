import{Body,Controller,Get,Post}from"@nestjs/common";
import{ProjectService}from"./project.service";
import{CurrentUser}from"../auth/current-user.decorator";
@Controller("projects")
export class ProjectController{
 constructor(private projects:ProjectService){}
 @Post() create(@Body()b:{name:string},@CurrentUser()user:any){return this.projects.create(user.companyId,b.name)}
 @Get() list(@CurrentUser()user:any){return this.projects.list(user.companyId)}
}