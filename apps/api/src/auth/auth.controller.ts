import{Body,Controller,Headers,Post,UnauthorizedException}from "@nestjs/common";
import{AuthService}from "./auth.service";

@Controller("auth")
export class AuthController{
 constructor(private auth:AuthService){}

 @Post("register-company")
 registerCompany(@Body() b:{companyName:string;name:string;email:string;password:string}){
   return this.auth.registerCompany(b);
 }

 @Post("register")
 register(@Body() b:{companyId:string;name:string;email:string;password:string;role?:string}){
   return this.auth.register(b);
 }

 @Post("login")
 login(@Body() b:{email:string;password:string}){
   return this.auth.login(b.email,b.password);
 }

 @Post("validate")
 validate(@Headers("authorization") h?:string){
   if(!h?.startsWith("Bearer ")) throw new UnauthorizedException("Bearer token required");
   return this.auth.validate(h.slice(7));
 }
}