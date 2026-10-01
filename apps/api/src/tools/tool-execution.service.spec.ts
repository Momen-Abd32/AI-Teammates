import{ToolExecutionService}from"./tool-execution.service";

describe("ToolExecutionService device bridge",()=>{
 const make=()=>{
  const policy={decide:jest.fn()};
  const executions={create:jest.fn(),complete:jest.fn(),get:jest.fn()};
  const approvals={request:jest.fn(),find:jest.fn(),decide:jest.fn()};
  const audit={record:jest.fn()};
  const sandbox={execute:jest.fn()};
  const activity={publish:jest.fn()};
  const devices={resolveAgentDevice:jest.fn(),requestCommand:jest.fn(),waitForCommand:jest.fn()};
  const org={agents:jest.fn()};
  return{service:new ToolExecutionService(policy as any,executions as any,approvals as any,audit as any,sandbox as any,activity as any,devices as any,org as any),policy,executions,approvals,audit,activity,devices,org};
 };

 it("resolves the agent device, sends the command, and returns the desktop result",async()=>{
  const x=make();
  x.policy.decide.mockResolvedValue({requiresApproval:false,reason:"allowed"});
  x.executions.create.mockResolvedValue({id:"exec-1",status:"RUNNABLE"});
  x.executions.complete.mockResolvedValue({id:"exec-1",status:"COMPLETED"});
  x.org.agents.mockResolvedValue([{id:"testing",companyId:"co",employeeId:"emp"}]);
  x.devices.resolveAgentDevice.mockResolvedValue({id:"device-1"});
  x.devices.requestCommand.mockResolvedValue({id:"cmd-1"});
  x.devices.waitForCommand.mockResolvedValue({id:"cmd-1",status:"COMPLETED",result:{exitCode:0,stdout:"42"}});
  const result=await x.service.request({companyId:"co",employeeId:"emp",agentId:"testing",name:"device.terminal.execute",resource:"device-1",arguments:{command:"node --version"}});
  expect(x.devices.requestCommand).toHaveBeenCalledWith(expect.objectContaining({deviceId:"device-1",agentId:"testing",action:"device.terminal.execute",arguments:{command:"node --version"}}));
  expect(x.devices.waitForCommand).toHaveBeenCalledWith({companyId:"co",employeeId:"emp",deviceId:"device-1",commandId:"cmd-1"},30000);
  expect(x.executions.complete).toHaveBeenCalledWith("exec-1","COMPLETED",expect.objectContaining({status:"COMPLETED",result:{exitCode:0,stdout:"42"}}));
  expect(result.execution?.status).toBe("COMPLETED");
 });

 it("does not execute a device command before human approval",async()=>{
  const x=make();
  x.policy.decide.mockResolvedValue({requiresApproval:true,reason:"Device terminal execution requires approval"});
  x.executions.create.mockResolvedValue({id:"exec-2",status:"WAITING_FOR_HUMAN"});
  x.approvals.request.mockResolvedValue({id:"approval-2",status:"PENDING"});
  const result=await x.service.request({companyId:"co",employeeId:"emp",agentId:"testing",name:"device.terminal.execute",resource:"device-1",arguments:{command:"npm test"}});
  expect(result.status).toBe("WAITING_FOR_HUMAN");
  expect(x.devices.requestCommand).not.toHaveBeenCalled();
  expect(x.devices.waitForCommand).not.toHaveBeenCalled();
  expect(x.approvals.request).toHaveBeenCalledWith(expect.objectContaining({executionId:"exec-2",action:"device.terminal.execute"}),"emp");
 });
});