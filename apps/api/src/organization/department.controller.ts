import { Body,Controller,Get,Param,Post } from "@nestjs/common";
import { DepartmentService } from "./department.service";
@Controller("departments")
export class DepartmentController {
  constructor(private service:DepartmentService){}
  @Post() create(@Body() b:{companyId:string;name:string}){return this.service.create(b.companyId,b.name);}
  @Get("company/:companyId") list(@Param("companyId") companyId:string){return this.service.list(companyId);}
}