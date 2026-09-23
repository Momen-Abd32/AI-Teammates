import { Module } from "@nestjs/common";
import { MemoryController } from "./memory.controller";
import { MemoryService } from "./memory.service";
import { MemoryEmbeddingService } from "./embedding.service";
import { OrganizationModule } from "../organization/organization.module";

@Module({
  imports:[OrganizationModule],
  controllers:[MemoryController],
  providers:[MemoryService,MemoryEmbeddingService],
  exports:[MemoryService],
})
export class MemoryModule {}