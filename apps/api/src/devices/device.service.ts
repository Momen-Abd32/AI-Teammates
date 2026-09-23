import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "crypto";
import { OrganizationService } from "../organization/organization.service";
import { DeviceGateway } from "./device.gateway";
import { DeviceRepository } from "./device.repository";

const DEFAULT_DEVICE_PERMISSIONS=["device.files.read","device.files.write","device.terminal.execute","device.browser","device.screenshot"];

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

  list(companyId:string,employeeId:string){return this.repo.listForEmployee(companyId,employeeId);}

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
    const command=await this.repo.createCommand({id:randomUUID(),companyId:input.companyId,deviceId:input.deviceId,agentId:input.agentId,action:input.action,arguments:input.arguments ?? {}});
    await this.gateway.sendCommand(command);
    return command;
  }
}
