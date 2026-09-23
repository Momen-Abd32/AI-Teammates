import { Module } from "@nestjs/common";
import { ConversationController } from "./conversation.controller";
import { ConversationRepository } from "./conversation.repository";
import { ConversationService } from "./conversation.service";
import { OrganizationModule } from "../organization/organization.module";

@Module({imports:[OrganizationModule],controllers:[ConversationController],providers:[ConversationRepository,ConversationService],exports:[ConversationService]})
export class ConversationModule {}