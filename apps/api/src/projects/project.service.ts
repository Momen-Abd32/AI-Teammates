import{Injectable,ForbiddenException,NotFoundException}from"@nestjs/common";
import{ProjectRepository}from"./project.repository";
@Injectable()
export class ProjectService{
 constructor(private repo:ProjectRepository){}
 create(companyId:string,name:string){return this.repo.create(companyId,name)}
 list(companyId:string){return this.repo.list(companyId)}
 async getForCompany(id:string,companyId:string){
  const project=await this.repo.list(companyId);
  const match=project.find(p=>p.id===id);
  if(match)return match;
  throw new NotFoundException("Project not found in company");
 }
}
