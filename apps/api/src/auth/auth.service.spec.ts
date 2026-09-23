import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

describe("AuthService security", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.AUTH_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
  });

  it("rejects production when AUTH_SECRET is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_SECRET;

    const service = new AuthService({} as any);

    expect(() => service.issue("company-1", "employee-1")).toThrow(
      new UnauthorizedException("AUTH_SECRET must be configured in production"),
    );
  });

  it("rejects an AUTH_SECRET shorter than 32 characters", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_SECRET = "too-short";

    const service = new AuthService({} as any);

    expect(() => service.issue("company-1", "employee-1")).toThrow(
      new UnauthorizedException("AUTH_SECRET must contain at least 32 characters"),
    );
  });

  it("round-trips a valid session with a strong secret", () => {
    process.env.NODE_ENV = "test";
    process.env.AUTH_SECRET = "01234567890123456789012345678901";

    const service = new AuthService({} as any);
    const issued = service.issue("company-1", "employee-1", "employee");

    expect(service.validate(issued.accessToken)).toEqual(
      expect.objectContaining({
        companyId: "company-1",
        employeeId: "employee-1",
        role: "employee",
      }),
    );
  });
});
