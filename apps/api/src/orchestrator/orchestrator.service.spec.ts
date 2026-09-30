import{OrchestratorService}from"./orchestrator.service";

describe("OrchestratorService",()=>{
 const make=()=>{
  const org={agents:jest.fn()};
  const tasks={create:jest.fn(),getForCompany:jest.fn()};
  const collaboration={requestTask:jest.fn(),respondTask:jest.fn()};
  const projects={getForCompany:jest.fn()};
  const agent={act:jest.fn(),receiveDelegatedResult:jest.fn()};
  return{service:new OrchestratorService(org as any,tasks as any,collaboration as any,projects as any,agent as any),org,tasks,collaboration,projects,agent};
 };

 it("runs a delegated agent and returns its result to the sender conversation",async()=>{
  const x=make();
  const sender={id:"coding",employeeId:"emp",role:"Coding",permissions:["agent.chat"]};
  const receiver={id:"testing",employeeId:"emp",role:"Testing",permissions:["agent.collaborate"],systemInstructions:"run tests"};
  x.org.agents.mockResolvedValue([sender,receiver]);
  x.tasks.create.mockResolvedValue({id:"task-1",companyId:"co",title:"Run tests",description:"Run tests",assignedAgentId:"testing",status:"WAITING_FOR_AGENT"});
  x.collaboration.respondTask.mockResolvedValue({task:{id:"task-1",status:"COMPLETED"},message:{id:"msg-2"}});
  x.agent.act.mockResolvedValue({status:"COMPLETED",response:"All tests passed"});
  const result=await x.service.dispatchAndRun({companyId:"co",employeeId:"emp",senderAgentId:"coding",receiverAgentId:"testing",title:"Run tests",description:"Run the test suite",conversationId:"conv-1"});
  expect(x.agent.act).toHaveBeenCalledWith(expect.objectContaining({taskId:"task-1",finalizeTask:false}));
  expect(x.collaboration.respondTask).toHaveBeenCalledWith(expect.objectContaining({taskId:"task-1",senderAgentId:"testing",receiverAgentId:"coding"}),"emp");
  expect(x.agent.receiveDelegatedResult).toHaveBeenCalledWith(expect.objectContaining({conversationId:"conv-1",taskId:"task-1",response:"All tests passed"}));
  expect(result.response).toBe("All tests passed");
 });

 it("keeps the delegated task open when the receiver needs human approval",async()=>{
  const x=make();
  x.org.agents.mockResolvedValue([
   {id:"coding",employeeId:"emp",role:"Coding",permissions:["agent.chat"]},
   {id:"testing",employeeId:"emp",role:"Testing",permissions:["agent.collaborate"],systemInstructions:"run tests"},
  ]);
  x.tasks.create.mockResolvedValue({id:"task-2",companyId:"co",title:"Run tests",description:"Run tests",assignedAgentId:"testing",status:"WAITING_FOR_AGENT"});
  x.agent.act.mockResolvedValue({status:"WAITING_FOR_HUMAN",runId:"run-2"});
  const result=await x.service.dispatchAndRun({companyId:"co",employeeId:"emp",senderAgentId:"coding",receiverAgentId:"testing",title:"Run tests",description:"Run the test suite",conversationId:"conv-2"});
  expect(result.status).toBe("WAITING_FOR_HUMAN");
  expect(x.collaboration.respondTask).not.toHaveBeenCalled();
  expect(x.agent.receiveDelegatedResult).not.toHaveBeenCalled();
 });
});