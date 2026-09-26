import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { ConversationService } from "./conversation.service";

@Controller("conversations")
export class ConversationController {
  constructor(private readonly service: ConversationService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.list(user.companyId, user.employeeId);
  }

  @Post()
  create(@Body() body: { agentId: string; title?: string }, @CurrentUser() user: any) {
    return this.service.create(user.companyId, user.employeeId, body.agentId, body.title);
  }

  @Get(":id/messages")
  messages(@Param("id") id: string, @Query("limit") limit: string | undefined, @CurrentUser() user: any) {
    return this.service.messages(id, user.companyId, user.employeeId, Number(limit ?? 30));
  }

  @Patch(":id/title")
  updateTitle(@Param("id") id: string, @Body() body: { title: string }, @CurrentUser() user: any) {
    return this.service.updateTitle(id, user.companyId, user.employeeId, body.title);
  }
}