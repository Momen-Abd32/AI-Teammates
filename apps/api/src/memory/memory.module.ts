import { Module } from "@nestjs/common";
import { MemoryController } from "./memory.controller";
import { MemoryService } from "./memory.service";
import { MemoryEmbeddingService } from "./embedding.service";
import { MemoryLearningService } from "./memory-learning.service";
import { OrganizationModule } from "../organization/organization.module";

@Module({
  imports:[OrganizationModule],
  controllers:[MemoryController],
  providers:[MemoryService,MemoryEmbeddingService,MemoryLearningService],
  exports:[MemoryService,MemoryLearningService],
})
export class MemoryModule {}