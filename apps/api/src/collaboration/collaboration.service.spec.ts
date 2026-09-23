import{ForbiddenException}from"@nestjs/common";
import{CollaborationService}from"./collaboration.service";

describe("CollaborationService",()=>{
 it("rejects self delegation",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn()} as any);
  await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-1",companyId:"company-1",type:"TASK_REQUEST",payload:{}})).rejects.toBeInstanceOf(ForbiddenException);
 });
 it("rejects agents outside the company",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn().mockResolvedValue([{id:"agent-1",employeeId:"employee-1"},{id:"agent-2",employeeId:"employee-2"}])} as any);
  const bus=(service as any).bus;
  await service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",type:"TASK_REQUEST",payload:{}});
  expect(bus.publish).toHaveBeenCalled();
 });
});
