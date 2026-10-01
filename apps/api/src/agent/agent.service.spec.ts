import{AgentService}from"./agent.service";

describe("AgentService execution loop",()=>{
 const make=()=>{
  const permissions={assertWithPermissions:jest.fn()};
  const audit={record:jest.fn()};
  const org={agents:jest.fn()};
  const memory={semanticSearch:jest.fn()};
  const learning={extract:jest.fn()};
  const conversations={context:jest.fn(),create:jest.fn(),addMessage:jest.fn(),updateTitle:jest.fn()};
  const activity={publish:jest.fn()};
  const toolRegistry={list:jest.fn(),get:jest.fn()};
  const toolExecutions={request:jest.fn()};
  const runs={create:jest.fn(),get:jest.fn(),update:jest.fn(),findWaitingByExecution:jest.fn(),claimWaiting:jest.fn()};
  const tasks={getForCompany:jest.fn(),updateStatus:jest.fn()};
  const service=new AgentService(permissions as any,audit as any,org as any,memory as any,learning as any,conversations as any,activity as any,toolRegistry as any,toolExecutions as any,runs as any,tasks as any);
  return{service,permissions,audit,org,memory,learning,conversations,activity,toolRegistry,toolExecutions,runs,tasks};
 };

 beforeEach(()=>{
  jest.restoreAllMocks();
  (globalThis as any).fetch=jest.fn();
 });

 it("plans a tool, executes it, then produces the final answer",async()=>{
  const x=make();
  x.org.agents.mockResolvedValue([{id:"coding",companyId:"co",employeeId:"emp",role:"Coding",permissions:["agent.chat","device.terminal.execute"],systemInstructions:""}]);
  x.memory.semanticSearch.mockResolvedValue([]);
  x.conversations.context.mockResolvedValue([]);
  x.toolRegistry.list.mockReturnValue([{name:"device.terminal.execute",description:"run terminal",permission:"device.terminal.execute",requiresApproval:true}]);
  x.toolRegistry.get.mockReturnValue({name:"device.terminal.execute"});
  x.runs.create.mockResolvedValue({id:"run-1",agentId:"coding",employeeId:"emp",companyId:"co",message:"run tests",maxSteps:5,currentStep:0,results:[],taskId:null,finalizeTask:true});
  x.runs.get.mockResolvedValue({id:"run-1",agentId:"coding",employeeId:"emp",companyId:"co",message:"run tests",maxSteps:5,currentStep:0,results:[],taskId:null,finalizeTask:true});
  x.toolExecutions.request.mockResolvedValue({result:{status:"COMPLETED",stdout:"all tests passed"}});
  const fetchMock=(globalThis.fetch as jest.Mock)
    .mockResolvedValueOnce({ok:true,json:async()=>({action:"TOOL",tool:"device.terminal.execute",reason:"run tests",arguments:{command:"npm test"}})})
    .mockResolvedValueOnce({ok:true,json:async()=>({response:"Tests passed successfully."})});
  const result=await x.service.act({agentId:"coding",employeeId:"emp",companyId:"co",message:"run tests"});
  expect(x.toolExecutions.request).toHaveBeenCalledWith(expect.objectContaining({
   agentId:"coding",name:"device.terminal.execute",arguments:{command:"npm test"},
  }));
  expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/v1/agents/respond"),expect.any(Object));
  expect(x.runs.update).toHaveBeenCalledWith("run-1",expect.objectContaining({status:"COMPLETED",completed:true}));
  expect(result).toEqual(expect.objectContaining({status:"COMPLETED",response:"Tests passed successfully."}));
 });

 it("pauses the run when a tool requires human approval",async()=>{
  const x=make();
  x.org.agents.mockResolvedValue([{id:"coding",companyId:"co",employeeId:"emp",role:"Coding",permissions:["agent.chat"],systemInstructions:""}]);
  x.memory.semanticSearch.mockResolvedValue([]);
  x.conversations.context.mockResolvedValue([]);
  x.toolRegistry.list.mockReturnValue([{name:"repository.write",description:"write code",permission:"repository.write",requiresApproval:true}]);
  x.toolRegistry.get.mockReturnValue({name:"repository.write"});
  x.runs.create.mockResolvedValue({id:"run-2",agentId:"coding",employeeId:"emp",companyId:"co",message:"change file",maxSteps:5,currentStep:0,results:[],taskId:null,finalizeTask:true});
  x.runs.get.mockResolvedValue({id:"run-2",agentId:"coding",employeeId:"emp",companyId:"co",message:"change file",maxSteps:5,currentStep:0,results:[],taskId:null,finalizeTask:true});
  x.toolExecutions.request.mockResolvedValue({status:"WAITING_FOR_HUMAN",execution:{id:"exec-2",status:"WAITING_FOR_HUMAN"},approval:{id:"approval-2",status:"PENDING"}});
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({action:"TOOL",tool:"repository.write",reason:"edit file",arguments:{path:"src/a.ts",content:"x"}})});
  const result=await x.service.act({agentId:"coding",employeeId:"emp",companyId:"co",message:"change file"});
  expect(result).toEqual(expect.objectContaining({status:"WAITING_FOR_HUMAN",runId:"run-2"}));
  expect(x.runs.update).toHaveBeenCalledWith("run-2",expect.objectContaining({
   status:"WAITING_FOR_HUMAN",waitingExecutionId:"exec-2",waitingApprovalId:"approval-2",
  }));
 });

 it("resumes an approved run and feeds the approved result into the next planner step",async()=>{
  const x=make();
  x.org.agents.mockResolvedValue([{id:"coding",companyId:"co",employeeId:"emp",role:"Coding",permissions:["agent.chat"],systemInstructions:""}]);
  x.memory.semanticSearch.mockResolvedValue([]);
  x.conversations.context.mockResolvedValue([]);
  x.toolRegistry.list.mockReturnValue([{name:"repository.write",description:"write code",permission:"repository.write",requiresApproval:true}]);
  x.toolRegistry.get.mockReturnValue({name:"repository.write"});
  x.runs.findWaitingByExecution.mockResolvedValue({id:"run-3",agentId:"coding",employeeId:"emp",companyId:"co",message:"change file",conversationId:null,currentStep:2,results:[],taskId:null,finalizeTask:true});
  x.runs.claimWaiting.mockResolvedValue({id:"run-3",agentId:"coding",employeeId:"emp",companyId:"co",message:"change file",conversationId:null,currentStep:2,results:[],taskId:null,finalizeTask:true});
  x.runs.get.mockResolvedValue({id:"run-3",agentId:"coding",employeeId:"emp",companyId:"co",message:"change file",maxSteps:5,currentStep:2,results:[{tool:"repository.write",result:{status:"COMPLETED"}}],taskId:null,finalizeTask:true});
  (globalThis.fetch as jest.Mock)
    .mockResolvedValueOnce({ok:true,json:async()=>({action:"NONE"})})
    .mockResolvedValueOnce({ok:true,json:async()=>({response:"The approved change is complete."})});
  const result=await x.service.resumeAfterApproval("exec-3","approval-3",true,"repository.write",{status:"COMPLETED"},"co","emp");
  expect(x.runs.claimWaiting).toHaveBeenCalledWith("run-3","exec-3","approval-3");
  expect(x.runs.update).toHaveBeenCalledWith("run-3",expect.objectContaining({status:"RUNNING"}));
  expect(result).toEqual(expect.objectContaining({status:"COMPLETED",response:"The approved change is complete."}));
 });

 it("rejects an approval without executing another tool",async()=>{
  const x=make();
  x.org.agents.mockResolvedValue([{id:"coding",companyId:"co",employeeId:"emp",role:"Coding",permissions:["agent.chat"],systemInstructions:""}]);
  x.memory.semanticSearch.mockResolvedValue([]);
  x.conversations.context.mockResolvedValue([]);
  x.runs.findWaitingByExecution.mockResolvedValue({id:"run-4",agentId:"coding",employeeId:"emp",companyId:"co",message:"delete file",conversationId:null,currentStep:1,results:[],taskId:null,finalizeTask:true});
  x.runs.claimWaiting.mockResolvedValue({id:"run-4",agentId:"coding",employeeId:"emp",companyId:"co",message:"delete file",conversationId:null,currentStep:1,results:[],taskId:null,finalizeTask:true});
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({response:"The requested action was rejected."})});
  const result=await x.service.resumeAfterApproval("exec-4","approval-4",false,"repository.delete",{}, "co","emp");
  expect(x.toolExecutions.request).not.toHaveBeenCalled();
  expect(x.runs.update).toHaveBeenCalledWith("run-4",expect.objectContaining({status:"REJECTED",completed:true}));
  expect(result).toEqual(expect.objectContaining({status:"REJECTED",response:"The requested action was rejected."}));
 });
});
