import { ForbiddenException } from "@nestjs/common";
import { PermissionService } from "../security/permission.service";

describe("permission isolation", () => {
  it("denies missing permission", () => {
    const p = new PermissionService();
    expect(() => p.assert({ companyId: "c1", employeeId: "e1", agentId: "a1" }, "memory.read")).toThrow(ForbiddenException);
  });

  it("does not leak permissions between agents", () => {
    const p = new PermissionService();
    p.grant("a1", "memory.read");
    expect(() => p.assert({ companyId: "c2", employeeId: "e2", agentId: "a2" }, "memory.read")).toThrow(ForbiddenException);
  });

  it("requires a complete tenant context before checking permissions", () => {
    const p = new PermissionService();
    expect(() => p.assert({ companyId: "", employeeId: "e1", agentId: "a1" }, "memory.read")).toThrow(ForbiddenException);
    expect(() => p.assert({ companyId: "c1", employeeId: "", agentId: "a1" }, "memory.read")).toThrow(ForbiddenException);
    expect(() => p.assert({ companyId: "c1", employeeId: "e1", agentId: "" }, "memory.read")).toThrow(ForbiddenException);
  });

  it("checks explicit agent permissions without accepting truthy non-array values", () => {
    const p = new PermissionService();
    const ctx = { companyId: "c1", employeeId: "e1", agentId: "a1" };
    expect(p.assertWithPermissions(ctx, "memory.read", ["memory.read"])).toBe(true);
    expect(() => p.assertWithPermissions(ctx, "memory.write", ["memory.read"])).toThrow(ForbiddenException);
    expect(() => p.assertWithPermissions(ctx, "memory.read", { includes: () => true })).toThrow(ForbiddenException);
  });
});
