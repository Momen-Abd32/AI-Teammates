import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "crypto";
import { OrganizationService } from "../organization/organization.service";
import { DeviceGateway } from "./device.gateway";
import { DeviceRepository } from "./device.repository";

const DEFAULT_DEVICE_PERMISSIONS=["device.files.read","device.browser","device.screenshot"];

@Injectable()
export class DeviceService {
  constructor(private readonly repo:DeviceRepository,private readonly org:OrganizationService,private readonly gateway:DeviceGateway){}

  async register(input:{companyId:string;employeeId:string;name:string;platform:string;capabilities?:string[]}) {
    if(!input.name?.trim()) throw new ConflictException("Device name is required");
    const token=randomBytes(32).toString("base64url");
    const device=await this.repo.create({
      id:randomUUID(),companyId:input.companyId,employeeId:input.employeeId,name:input.name.trim(),
      platform:input.platform.trim(),tokenHash:createHash("sha256").update(token).digest("hex"),capabilities:input.capabilities ?? [],
    });
    return {...device,deviceToken:token};
  }

  async list(companyId:string,employeeId:string){
    const devices=await this.repo.listForEmployee(companyId,employeeId);
    return Promise.all(devices.map(async device=>({
      ...device,
      bindings:await this.repo.bindingsForDevice(device.id),
    })));
  }

  async revoke(id:string,companyId:string,employeeId:string){
    const device=await this.repo.revoke(id,companyId,employeeId);
    if(!device) throw new NotFoundException("Device not found");
    this.gateway.disconnect(id);
    return device;
  }

  async bind(input:{companyId:string;employeeId:string;deviceId:string;agentId:string;permissions?:string[]}) {
    const device=await this.repo.findForEmployee(input.deviceId,input.companyId,input.employeeId);
    if(!device) throw new NotFoundException("Device not found");
    const agents=await this.org.agents(input.companyId);
    const agent=agents.find(a=>a.id===input.agentId);
    if(!agent || agent.employeeId!==input.employeeId) throw new ForbiddenException("Agent does not belong to employee");
    return this.repo.bind(input.deviceId,input.agentId,input.permissions ?? DEFAULT_DEVICE_PERMISSIONS);
  }

  async unbind(input:{companyId:string;employeeId:string;deviceId:string;agentId:string}) {
    const device=await this.repo.findForEmployee(input.deviceId,input.companyId,input.employeeId);
    if(!device) throw new NotFoundException("Device not found");
    const agents=await this.org.agents(input.companyId);
    const agent=agents.find(a=>a.id===input.agentId);
    if(!agent || agent.employeeId!==input.employeeId) throw new ForbiddenException("Agent does not belong to employee");
    await this.repo.unbind(input.deviceId,input.agentId);
    return {ok:true};
  }

  async resolveAgentDevice(input:{companyId:string;employeeId:string;agentId:string}){
    const devices=await this.repo.listForEmployee(input.companyId,input.employeeId);
    for(const device of devices){
      if(device.status==="REVOKED")continue;
      const binding=await this.repo.binding(device.id,input.agentId);
      if(binding?.active)return device;
    }
    return null;
  }

  async waitForCommand(input:{companyId:string;employeeId:string;deviceId:string;commandId:string},timeoutMs=30000){ const command=await this.repo.commandForDevice(input.commandId,input.deviceId); if(!command)return null; return this.repo.waitForCommand(input.commandId,timeoutMs); }

  async requestCommand(input:{companyId:string;employeeId:string;deviceId:string;agentId:string;action:string;arguments?:Record<string,unknown>}) {
    const device=await this.repo.findForEmployee(input.deviceId,input.companyId,input.employeeId);
    if(!device || device.status==="REVOKED") throw new ForbiddenException("Device is unavailable");
    const agents=await this.org.agents(input.companyId);
    const agent=agents.find(a=>a.id===input.agentId);
    if(!agent || agent.employeeId!==input.employeeId) throw new ForbiddenException("Agent does not belong to employee");
    const binding=await this.repo.binding(input.deviceId,input.agentId);
    if(!binding) throw new ForbiddenException("Agent is not bound to this device");
    const permissions=Array.isArray(binding.permissions)?binding.permissions:[];
    if(!permissions.includes(input.action)) throw new ForbiddenException("Device permission denied");
    if(input.action==="device.terminal.execute" && !permissions.includes("device.terminal.execute"))
      throw new ForbiddenException("Terminal access is not enabled for this agent");
    if(input.action==="device.files.write" && !permissions.includes("device.files.write"))
      throw new ForbiddenException("File write access is not enabled for this agent");
    const command=await this.repo.createCommand({id:randomUUID(),companyId:input.companyId,deviceId:input.deviceId,agentId:input.agentId,action:input.action,arguments:input.arguments ?? {}});
    try {
      await this.gateway.sendCommand(command);
    } catch (error) {
      await this.repo.completeCommand(command.id,"FAILED",{error:error instanceof Error ? error.message : String(error)});
      throw error;
    }
    return command;
  }
}
