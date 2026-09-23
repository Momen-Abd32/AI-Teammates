import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";

@Injectable()
export class AuthService {
  issueDemoSession(companyId: string, employeeId: string) {
    return {
      accessToken: randomUUID(),
      companyId,
      employeeId,
      expiresIn: 3600,
    };
  }
}
