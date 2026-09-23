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
 ];
 list(){return [...this.tools];}
 get(name:string){return this.tools.find(t=>t.name===name);}
}
