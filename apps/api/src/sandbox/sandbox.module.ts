import{Module}from "@nestjs/common";
import{SandboxService}from "./sandbox.service";
import{SandboxController}from "./sandbox.controller";
import{OrganizationModule}from "../organization/organization.module";
@Module({imports:[OrganizationModule],controllers:[SandboxController],providers:[SandboxService],exports:[SandboxService]})
export class SandboxModule{}