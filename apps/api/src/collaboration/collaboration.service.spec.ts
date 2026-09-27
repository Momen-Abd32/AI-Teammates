import{ForbiddenException}from"@nestjs/common";
import{CollaborationService}from"./collaboration.service";

describe("CollaborationService",()=>{
 const agents=[
  {id:"agent-1",employeeId:"employee-1",companyId:"company-1",permissions:["agent.collaborate"]},
  {id:"agent-2",employeeId:"employee-2",companyId:"company-1",permissions:["agent.collaborate"]}
 ];

 it("rejects self delegation",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn()} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any);
  await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-1",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
 });

 it("rejects agents outside the company",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn().mockResolvedValue([{...agents[0]},{id:"agent-2",employeeId:"employee-2",companyId:"company-2",permissions:["agent.collaborate"]}])} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any);
  const bus=(service as any).bus;
  await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
  expect(bus.publish).not.toHaveBeenCalled();
 });

 it("rejects a receiver that is not present in the authenticated company",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn().mockResolvedValue([agents[0]])} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any);
  await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
 });

 it("rejects collaboration when the receiver lacks the collaboration permission",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn().mockResolvedValue([{...agents[0]},{...agents[1],permissions:[]}])} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any);
  await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
 });

 it("persists, starts and publishes a valid cross-agent task request",async()=>{
  const bus={publish:jest.fn().mockResolvedValue("stream-1")};
  const messages={create:jest.fn().mockResolvedValue({id:"message-1"})};
  const activity={publish:jest.fn().mockResolvedValue(undefined)};
  const org={agents:jest.fn().mockResolvedValue(agents)};
  const tasks={getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1",projectId:"project-1",assignedAgentId:"agent-2"}),updateStatus:jest.fn().mockResolvedValue({})};
  const service=new CollaborationService(bus as any,messages as any,activity as any,org as any,tasks as any);

  const result=await service.requestTask({
   taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",projectId:"project-1",
   type:"TASK_REQUEST",payload:{title:"Run QA",description:"Execute the API test suite"}
  },"employee-1");

  expect(tasks.getForCompany).toHaveBeenCalledWith("task-1","company-1");
  expect(tasks.updateStatus).toHaveBeenCalledWith("task-1","IN_PROGRESS","company-1");
  expect(messages.create).toHaveBeenCalledWith(expect.objectContaining({type:"TASK_REQUEST",companyId:"company-1",senderAgentId:"agent-1",receiverAgentId:"agent-2"}));
  expect(activity.publish).toHaveBeenCalled();
  expect(bus.publish).toHaveBeenCalledWith(expect.objectContaining({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",type:"TASK_REQUEST"}));
  expect(result).toBe("stream-1");
 });

 it("rejects a task whose project context does not match",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn().mockResolvedValue(agents)} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1",projectId:"project-1",assignedAgentId:"agent-2"})} as any);
  await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",projectId:"project-2",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
 });

 it("persists and publishes a valid agent response and completes the task",async()=>{
  const bus={publish:jest.fn(),publishResponse:jest.fn().mockResolvedValue("response-1")};
  const messages={create:jest.fn().mockResolvedValue({id:"message-2"})};
  const activity={publish:jest.fn().mockResolvedValue(undefined)};
  const org={agents:jest.fn().mockResolvedValue(agents)};
  const task={id:"task-1",companyId:"company-1",projectId:"project-1",assignedAgentId:"agent-2",status:"IN_PROGRESS"};
  const tasks={getForCompany:jest.fn().mockResolvedValue(task),updateStatus:jest.fn().mockResolvedValue({...task,status:"COMPLETED"})};
  const service=new CollaborationService(bus as any,messages as any,activity as any,org as any,tasks as any);

  const result=await service.respondTask({
   taskId:"task-1",senderAgentId:"agent-2",receiverAgentId:"agent-1",companyId:"company-1",projectId:"project-1",
   type:"TASK_RESPONSE",payload:{status:"COMPLETED",response:"QA passed"}
  },"employee-2");

  expect(messages.create).toHaveBeenCalledWith(expect.objectContaining({type:"TASK_RESPONSE",senderAgentId:"agent-2",receiverAgentId:"agent-1"}));
  expect(tasks.updateStatus).toHaveBeenCalledWith("task-1","COMPLETED","company-1");
  expect(bus.publishResponse).toHaveBeenCalledWith(expect.objectContaining({taskId:"task-1",type:"TASK_RESPONSE"}));
  expect(result.task.status).toBe("COMPLETED");
 });

 it("rejects a response from an agent that is not assigned to the task",async()=>{
  const service=new CollaborationService({publish:jest.fn(),publishResponse:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn().mockResolvedValue(agents)} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1",assignedAgentId:"agent-1",status:"IN_PROGRESS"})} as any);
  await expect(service.respondTask({
   taskId:"task-1",senderAgentId:"agent-2",receiverAgentId:"agent-1",companyId:"company-1",type:"TASK_RESPONSE",payload:{}
  },"employee-2")).rejects.toBeInstanceOf(ForbiddenException);
 });
});
