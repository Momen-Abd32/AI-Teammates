import{AgentTaskWorker}from"./agent-task.worker";

describe("AgentTaskWorker",()=>{
  function make(){
    const redis={ack:jest.fn().mockResolvedValue(undefined),publish:jest.fn().mockResolvedValue("response-1")};
    const org={agents:jest.fn().mockResolvedValue([
      {id:"agent-a",employeeId:"employee-a",companyId:"company-1"},
      {id:"agent-b",employeeId:"employee-b",companyId:"company-1"}
    ])};
    const tasks={
      getForCompany:jest.fn().mockResolvedValue({
        id:"task-1",companyId:"company-1",assignedAgentId:"agent-b",projectId:"project-1",
        title:"QA task",description:"Run tests"
      }),
      updateStatus:jest.fn().mockResolvedValue(undefined)
    };
    const messages={create:jest.fn().mockResolvedValue({id:"message-1"})};
    const agents={chat:jest.fn().mockResolvedValue({response:"Tests passed"})};
    const worker=new AgentTaskWorker(redis as any,org as any,tasks as any,messages as any,agents as any);
    return{worker,redis,org,tasks,messages,agents};
  }

  it("executes a delegated task and publishes a response",async()=>{
    const{worker,redis,tasks,messages,agents}=make();
    await (worker as any).handle("stream-1",{
      type:"TASK_REQUEST",taskId:"task-1",companyId:"company-1",
      senderAgentId:"agent-a",receiverAgentId:"agent-b",projectId:"project-1",
      payload:JSON.stringify({title:"QA task",description:"Run tests"})
    });
    expect(tasks.updateStatus).toHaveBeenNthCalledWith(1,"task-1","IN_PROGRESS","company-1");
    expect(agents.chat).toHaveBeenCalledWith(expect.objectContaining({
      agentId:"agent-b",employeeId:"employee-b",companyId:"company-1"
    }));
    expect(messages.create).toHaveBeenCalledWith(expect.objectContaining({
      type:"TASK_RESPONSE",senderAgentId:"agent-b",receiverAgentId:"agent-a",companyId:"company-1"
    }));
    expect(redis.publish).toHaveBeenCalledWith("agent:responses",expect.objectContaining({
      taskId:"task-1",type:"TASK_RESPONSE",companyId:"company-1"
    }));
    expect(tasks.updateStatus).toHaveBeenNthCalledWith(2,"task-1","COMPLETED","company-1");
    expect(redis.ack).toHaveBeenCalledWith("agent:tasks","agent-runtime","stream-1");
  });

  it("fails closed when the task is assigned to a different receiver",async()=>{
    const{worker,redis,tasks,agents}=make();
    tasks.getForCompany.mockResolvedValueOnce({
      id:"task-1",companyId:"company-1",assignedAgentId:"agent-a",projectId:"project-1",
      title:"QA task",description:"Run tests"
    });
    await (worker as any).handle("stream-2",{
      type:"TASK_REQUEST",taskId:"task-1",companyId:"company-1",
      senderAgentId:"agent-a",receiverAgentId:"agent-b",projectId:"project-1",payload:"{}"
    });
    expect(agents.chat).not.toHaveBeenCalled();
    expect(tasks.updateStatus).toHaveBeenCalledWith("task-1","FAILED","company-1");
    expect(redis.ack).toHaveBeenCalledWith("agent:tasks","agent-runtime","stream-2");
  });
});
