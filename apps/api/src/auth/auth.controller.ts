import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("demo-session")
  session(@Body() body: { companyId: string; employeeId: string }) {
    return this.auth.issueDemoSession(body.companyId, body.employeeId);
  }
}
