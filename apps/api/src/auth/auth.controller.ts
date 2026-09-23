import {Body,Controller,Post} from "@nestjs/common";
import {AuthService} from "./auth.service";
@Controller("auth")
export class AuthController{
 constructor(private readonly auth:AuthService){}
 @Post("demo-session") session(@Body() b:{companyId:string;employeeId:string}){return this.auth.issueDemoSession(b.companyId,b.employeeId);}
}