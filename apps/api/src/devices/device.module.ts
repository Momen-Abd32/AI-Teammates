import { Module } from "@nestjs/common";
import { OrganizationModule } from "../organization/organization.module";
import { DeviceController } from "./device.controller";
import { DeviceGateway } from "./device.gateway";
import { DeviceRepository } from "./device.repository";
import { DeviceService } from "./device.service";

@Module({
  imports:[OrganizationModule],
  controllers:[DeviceController],
  providers:[DeviceRepository,DeviceGateway,DeviceService],
  exports:[DeviceService,DeviceGateway],
})
export class DeviceModule {}
