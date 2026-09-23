import { Injectable } from "@nestjs/common";
import { OrganizationRepository } from "./organization.repository";

@Injectable()
export class OrganizationService {
  constructor(private repo:OrganizationRepository) {}

  createCompany(name:string) {
    if(!name.trim()) throw new Error("Company name is required");
    return this.repo.createCompany(name.trim());
  }

  createEmployee(b:{companyId:string;name:string;email:string;role:string}) {
    return this.repo.createEmployee(b.companyId,b.name,b.email,b.role);
  }

  createAgent(b:{companyId:string;employeeId:string;role:string;systemInstructions?:string}) {
    return this.repo.createAgent(b.companyId,b.employeeId,b.role,b.systemInstructions ?? "");
  }

  employees(companyId:string) { return this.repo.employees(companyId); }
  agents(companyId:string) { return this.repo.agents(companyId); }
}
