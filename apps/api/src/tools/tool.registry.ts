import {Injectable}from "@nestjs/common";
import {ToolDefinition}from "./tool.types";

@Injectable()
export class ToolRegistry{
 private readonly tools:ToolDefinition[]=[
  {name:"repository.read",description:"Read repository files or metadata",permission:"repository.read",sensitive:false,requiresApproval:false},
  {name:"repository.write",description:"Create or modify repository content",permission:"repository.write",sensitive:true,requiresApproval:true},
  {name:"repository.delete",description:"Delete repository content",permission:"repository.delete",sensitive:true,requiresApproval:true},
  {name:"terminal.execute",description:"Execute code in the isolated worker sandbox",permission:"terminal.execute",sensitive:true,requiresApproval:true},
  {name:"issue.create",description:"Create an issue in the project tracker",permission:"issue.create",sensitive:true,requiresApproval:true},
  {name:"device.files.read",description:"Read files from the employee workspace",permission:"device.files.read",sensitive:false,requiresApproval:false},
  {name:"device.files.write",description:"Write files on the employee workspace",permission:"device.files.write",sensitive:true,requiresApproval:true},
  {name:"device.terminal.execute",description:"Execute a command on the employee device workspace",permission:"device.terminal.execute",sensitive:true,requiresApproval:true},
  {name:"device.browser",description:"Control the employee browser through the desktop runtime",permission:"device.browser",sensitive:true,requiresApproval:true},
  {name:"device.screenshot",description:"Capture the employee workspace screen",permission:"device.screenshot",sensitive:false,requiresApproval:false},
 ];
 list(){return [...this.tools];}
 get(name:string){return this.tools.find(t=>t.name===name);}
}
