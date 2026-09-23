import {SandboxService}from "../sandbox/sandbox.service";
describe("SandboxService",()=>{
 it("rejects unsupported languages",async()=>{
  const service=new SandboxService();
  await expect(service.execute("agent","bash","echo hi")).rejects.toThrow();
 });
 it("rejects oversized code",async()=>{
  const service=new SandboxService();
  await expect(service.execute("agent","python","x".repeat(20001))).rejects.toThrow();
 });
});
