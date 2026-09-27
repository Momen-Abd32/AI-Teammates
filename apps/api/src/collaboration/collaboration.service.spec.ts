import{ForbiddenException}from"@nestjs/common";
import{CollaborationService}from"./collaboration.service";

describe("CollaborationService",()=>{
 it("rejects self delegation",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn()} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any);
  await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-1",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
 });
 it("rejects agents outside the company",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn().mockResolvedValue([{id:"agent-1",employeeId:"employee-1",permissions:["agent.collaborate"]},{id:"agent-2",employeeId:"employee-2",permissions:["agent.collaborate"]}])} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any);
  const bus=(service as any).bus;
  await service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1");
  expect(bus.publish).toHaveBeenCalled();
 });

  it("rejects a receiver that is not present in the authenticated company",async()=>{
    const service=new CollaborationService(
      {publish:jest.fn()} as any,
      {create:jest.fn()} as any,
      {publish:jest.fn()} as any,
      {agents:jest.fn().mockResolvedValue([{id:"agent-1",employeeId:"employee-1",companyId:"company-1",permissions:["agent.collaborate"]}])} as any,
      {getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any
    );
    await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects collaboration when the receiver lacks the collaboration permission",async()=>{
    const service=new CollaborationService(
      {publish:jest.fn()} as any,
      {create:jest.fn()} as any,
      {publish:jest.fn()} as any,
      {agents:jest.fn().mockResolvedValue([
        {id:"agent-1",employeeId:"employee-1",companyId:"company-1",permissions:["agent.collaborate"]},
        {id:"agent-2",employeeId:"employee-2",companyId:"company-1",permissions:[]}
      ])} as any,
      {getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any
    );
    await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
