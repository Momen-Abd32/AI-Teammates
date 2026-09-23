import {ToolRegistry}from "../tools/tool.registry";
describe("ToolRegistry",()=>{
 const registry=new ToolRegistry();
 it("marks destructive tools for approval",()=>{
  expect(registry.get("repository.delete")?.requiresApproval).toBe(true);
  expect(registry.get("terminal.execute")?.requiresApproval).toBe(true);
 });
 it("allows read tools without approval",()=>{
  expect(registry.get("repository.read")?.requiresApproval).toBe(false);
 });
});
