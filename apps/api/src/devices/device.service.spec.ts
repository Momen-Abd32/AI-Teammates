import{ForbiddenException}from"@nestjs/common";import{DeviceService}from"./device.service";

describe("DeviceService command authorization",()=>{
 const repo:any={findForEmployee:jest.fn(),binding:jest.fn(),createCommand:jest.fn(),completeCommand:jest.fn(),listForEmployee:jest.fn()};
 const org:any={agents:jest.fn()};
 const gateway:any={sendCommand:jest.fn(),disconnect:jest.fn()};
 let service:DeviceService;
 beforeEach(()=>{jest.clearAllMocks();service=new DeviceService(repo,org,gateway);});
 const device={id:"device-1",status:"ONLINE"};
 const agent={id:"agent-1",employeeId:"employee-1"};
 const base={companyId:"company-1",employeeId:"employee-1",deviceId:"device-1",agentId:"agent-1",action:"device.files.read"};
 it("allows a bound agent with the requested permission",async()=>{
  repo.findForEmployee.mockResolvedValue(device);org.agents.mockResolvedValue([agent]);repo.binding.mockResolvedValue({active:true,permissions:["device.files.read"]});repo.createCommand.mockResolvedValue({id:"cmd-1",...base});
  await expect(service.requestCommand(base)).resolves.toMatchObject({id:"cmd-1"});expect(gateway.sendCommand).toHaveBeenCalled();
 });
 it("rejects an agent that is not bound",async()=>{
  repo.findForEmployee.mockResolvedValue(device);org.agents.mockResolvedValue([agent]);repo.binding.mockResolvedValue(null);
  await expect(service.requestCommand(base)).rejects.toThrow(new ForbiddenException("Agent is not bound to this device"));
 });
 it("rejects a bound agent without the requested permission",async()=>{
  repo.findForEmployee.mockResolvedValue(device);org.agents.mockResolvedValue([agent]);repo.binding.mockResolvedValue({active:true,permissions:["device.files.read"]});
  await expect(service.requestCommand({...base,action:"device.files.write"})).rejects.toThrow(new ForbiddenException("Device permission denied"));
 });
 it("rejects a revoked device",async()=>{
  repo.findForEmployee.mockResolvedValue({...device,status:"REVOKED"});
  await expect(service.requestCommand(base)).rejects.toThrow(new ForbiddenException("Device is unavailable"));
 });
 it("rejects an agent owned by another employee",async()=>{
  repo.findForEmployee.mockResolvedValue(device);org.agents.mockResolvedValue([{id:"agent-1",employeeId:"other-employee"}]);
  await expect(service.requestCommand(base)).rejects.toThrow(new ForbiddenException("Agent does not belong to employee"));
 });

 it("fails closed and finalizes the command when the desktop cannot receive it",async()=>{
  repo.findForEmployee.mockResolvedValue(device);org.agents.mockResolvedValue([agent]);repo.binding.mockResolvedValue({active:true,permissions:["device.files.write"]});repo.createCommand.mockResolvedValue({id:"cmd-2",...base,action:"device.files.write"});
  gateway.sendCommand.mockRejectedValue(new Error("Device is offline"));
  await expect(service.requestCommand({...base,action:"device.files.write",arguments:{path:"a.txt",content:"x"}})).rejects.toThrow("Device is offline");
  expect(repo.completeCommand).toHaveBeenCalledWith("cmd-2","FAILED",{error:"Device is offline"});
 });
 it("resolves only an active binding on a non-revoked device",async()=>{
  repo.listForEmployee=jest.fn().mockResolvedValue([{id:"revoked",status:"REVOKED"},{id:"unbound",status:"ONLINE"},{id:"bound",status:"ONLINE"}]);
  repo.binding.mockImplementation(async(id:string)=>id==="bound"?{active:true,agentId:"agent-1"}:null);
  await expect(service.resolveAgentDevice({companyId:"company-1",employeeId:"employee-1",agentId:"agent-1"})).resolves.toMatchObject({id:"bound"});
 });
});
