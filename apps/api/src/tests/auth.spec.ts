import {AuthService} from "../auth/auth.service";

describe("authentication",()=>{
  const db:any={query:jest.fn()};
  beforeEach(()=>{db.query.mockReset();process.env.AUTH_SECRET="test-secret";});

  it("issues and validates a signed session",()=>{
    const service=new AuthService(db);
    const issued=service.issue("company-1","employee-1");
    expect(service.validate(issued.accessToken)).toMatchObject({companyId:"company-1",employeeId:"employee-1"});
  });

  it("rejects a tampered token",()=>{
    const service=new AuthService(db);
    const issued=service.issue("company-1","employee-1");
    expect(()=>service.validate(issued.accessToken+".tampered")).toThrow();
  });

  it("rejects short passwords during registration",async()=>{
    const service=new AuthService(db);
    await expect(service.register({companyId:"c",name:"Test",email:"t@example.com",password:"short"})).rejects.toThrow();
  });
});
