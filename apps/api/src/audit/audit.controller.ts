import {Controller,Get,Param} from "@nestjs/common";
import {AuditService} from "./audit.service";
@Controller("audit")
export class AuditController{constructor(private readonly audit:AuditService){}@Get("company/:companyId")list(@Param("companyId")id:string){return this.audit.list(id);}}