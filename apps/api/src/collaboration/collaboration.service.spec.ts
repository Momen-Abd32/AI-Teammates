import{ForbiddenException}from"@nestjs/common";
import{CollaborationService}from"./collaboration.service";

describe("CollaborationService",()=>{
 it("rejects self delegation",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn()} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any);
  await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-1",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
 });
 it("rejects agents outside the company",async()=>{
  const service=new CollaborationService({publish:jest.fn()} as any,{create:jest.fn()} as any,{publish:jest.fn()} as any,{agents:jest.fn().mockResolvedValue([{id:"agent-1",employeeId:"employee-1",companyId:"company-1",permissions:["agent.collaborate"]},{id:"agent-2",employeeId:"employee-2",companyId:"company-2",permissions:["agent.collaborate"]}])} as any,{getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1"})} as any);
  const bus=(service as any).bus;
  await expect(service.requestTask({taskId:"task-1",senderAgentId:"agent-1",receiverAgentId:"agent-2",companyId:"company-1",type:"TASK_REQUEST",payload:{}}, "employee-1")).rejects.toBeInstanceOf(ForbiddenException);
  expect(bus.publish).not.toHaveBeenCalled();
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
  it("persists and publishes a valid cross-agent task request",async()=>{
    const bus={publish:jest.fn().mockResolvedValue("stream-1")};
    const messages={create:jest.fn().mockResolvedValue({id:"message-1"})};
    const activity={publish:jest.fn().mockResolvedValue(undefined)};
    const org={agents:jest.fn().mockResolvedValue([
      {id:"agent-1",employeeId:"employee-1",companyId:"company-1",permissions:["agent.collaborate"]},
      {id:"agent-2",employeeId:"employee-2",companyId:"company-1",permissions:["agent.collaborate"]}
    ])};
    const tasks={getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1",projectId:"project-1"})};
    const service=new CollaborationService(bus as any,messages as any,activity as any,org as any,tasks as any);

    const result=await service.requestTask({
      taskId:"task-1",
      senderAgentId:"agent-1",
      receiverAgentId:"agent-2",
      companyId:"company-1",
      projectId:"project-1",
      type:"TASK_REQUEST",
      payload:{title:"Run QA",description:"Execute the API test suite"}
    },"employee-1");

    expect(tasks.getForCompany).toHaveBeenCalledWith("task-1","company-1");
    expect(messages.create).toHaveBeenCalledWith(expect.objectContaining({
      type:"TASK_REQUEST",
      companyId:"company-1",
      senderAgentId:"agent-1",
      receiverAgentId:"agent-2"
    }));
    expect(activity.publish).toHaveBeenCalled();
    expect(bus.publish).toHaveBeenCalledWith(expect.objectContaining({
      taskId:"task-1",
      senderAgentId:"agent-1",
      receiverAgentId:"agent-2",
      companyId:"company-1",
      type:"TASK_REQUEST"
    }));
    expect(result).toBe("stream-1");
  });

  it("rejects a task whose project context does not match",async()=>{
    const service=new CollaborationService(
      {publish:jest.fn()} as any,
      {create:jest.fn()} as any,
      {publish:jest.fn()} as any,
      {agents:jest.fn().mockResolvedValue([
        {id:"agent-1",employeeId:"employee-1",companyId:"company-1",permissions:["agent.collaborate"]},
        {id:"agent-2",employeeId:"employee-2",companyId:"company-1",permissions:["agent.collaborate"]}
      ])} as any,
      {getForCompany:jest.fn().mockResolvedValue({id:"task-1",companyId:"company-1",projectId:"project-1"})} as any
    );

    await expect(service.requestTask({
      taskId:"task-1",
      senderAgentId:"agent-1",
      receiverAgentId:"agent-2",
      companyId:"company-1",
      projectId:"project-2",
      type:"TASK_REQUEST",
      payload:{}
    },"employee-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

});
