import {Injectable,UnauthorizedException} from "@nestjs/common";
import {createHmac,randomBytes,scryptSync,timingSafeEqual} from "crypto";
import {DatabaseService} from "../infrastructure/database.service";

type Session={companyId:string;employeeId:string;expiresAt:number};
const TTL=60*60*8;

@Injectable()
export class AuthService {
  constructor(private db:DatabaseService){}

  private secret(){return process.env.AUTH_SECRET ?? "CHANGE_ME_IN_PRODUCTION";}

  private sign(payload:Session){
    const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig=createHmac("sha256",this.secret()).update(body).digest("base64url");
    return body+"."+sig;
  }

  private verify(token:string):Session{
    const [body,sig]=token.split(".");
    if(!body||!sig) throw new UnauthorizedException("Invalid session");
    const expected=createHmac("sha256",this.secret()).update(body).digest("base64url");
    if(sig.length!==expected.length || !timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) {
      throw new UnauthorizedException("Invalid session");
    }
    let payload:Session;
    try{payload=JSON.parse(Buffer.from(body,"base64url").toString("utf8"));}catch{throw new UnauthorizedException("Invalid session");}
    if(payload.expiresAt<Date.now()) throw new UnauthorizedException("Session expired");
    return payload;
  }

  async register(input:{companyId:string;name:string;email:string;password:string;role?:string}){
    if(input.password.length<10) throw new UnauthorizedException("Password must contain at least 10 characters");
    const salt=randomBytes(16).toString("hex");
    const hash=scryptSync(input.password,salt,64).toString("hex");
    const passwordHash=salt+":"+hash;
    const r=await this.db.query(
      `INSERT INTO employees(id,company_id,name,email,role,password_hash)
       VALUES(gen_random_uuid(),$1,$2,lower($3),$4,$5)
       RETURNING id,company_id AS "companyId",name,email,role`,
      [input.companyId,input.name,input.email,input.role??"employee",passwordHash],
    );
    return this.issue(r.rows[0].companyId,r.rows[0].id);
  }

  async login(email:string,password:string){
    const r=await this.db.query(
      `SELECT id,company_id AS "companyId",password_hash AS "passwordHash" FROM employees WHERE lower(email)=lower($1)`,
      [email],
    );
    const employee=r.rows[0];
    if(!employee?.passwordHash) throw new UnauthorizedException("Invalid email or password");
    const [salt,stored]=employee.passwordHash.split(":");
    const derived=scryptSync(password,salt,64);
    const expected=Buffer.from(stored,"hex");
    if(expected.length!==derived.length || !timingSafeEqual(expected,derived)) throw new UnauthorizedException("Invalid email or password");
    return this.issue(employee.companyId,employee.id);
  }

  issue(companyId:string,employeeId:string){
    const payload={companyId,employeeId,expiresAt:Date.now()+TTL*1000};
    return {accessToken:this.sign(payload),companyId,employeeId,expiresIn:TTL};
  }

  validate(token:string){return this.verify(token);}
}