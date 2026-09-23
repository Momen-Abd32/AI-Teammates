import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service";

@Injectable()
export class DeviceRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(input: { id:string; companyId:string; employeeId:string; name:string; platform:string; tokenHash:string; capabilities:string[] }) {
    const r=await this.db.query(
      'INSERT INTO devices(id,company_id,employee_id,name,platform,token_hash,capabilities) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id,company_id AS "companyId",employee_id AS "employeeId",name,platform,status,capabilities,last_seen_at AS "lastSeenAt",created_at AS "createdAt"',
      [input.id,input.companyId,input.employeeId,input.name,input.platform,input.tokenHash,JSON.stringify(input.capabilities)],
    );
    return r.rows[0];
  }

  async findForEmployee(id:string,companyId:string,employeeId:string) {
    const r=await this.db.query(
      'SELECT id,company_id AS "companyId",employee_id AS "employeeId",name,platform,status,capabilities,last_seen_at AS "lastSeenAt",created_at AS "createdAt" FROM devices WHERE id=$1 AND company_id=$2 AND employee_id=$3',
      [id,companyId,employeeId],
    );
    return r.rows[0] ?? null;
  }

  async findByTokenHash(tokenHash:string) {
    const r=await this.db.query(
      'SELECT id,company_id AS "companyId",employee_id AS "employeeId",name,platform,status,capabilities FROM devices WHERE token_hash=$1',
      [tokenHash],
    );
    return r.rows[0] ?? null;
  }

  async listForEmployee(companyId:string,employeeId:string) {
    const r=await this.db.query(
      'SELECT id,company_id AS "companyId",employee_id AS "employeeId",name,platform,status,capabilities,last_seen_at AS "lastSeenAt",created_at AS "createdAt" FROM devices WHERE company_id=$1 AND employee_id=$2 ORDER BY created_at DESC',
      [companyId,employeeId],
    );
    return r.rows;
  }

  async heartbeat(id:string) {
    await this.db.query("UPDATE devices SET status='ONLINE',last_seen_at=now() WHERE id=$1 AND status<>'REVOKED'",[id]);
  }

  async revoke(id:string,companyId:string,employeeId:string) {
    const r=await this.db.query("UPDATE devices SET status='REVOKED' WHERE id=$1 AND company_id=$2 AND employee_id=$3 RETURNING id,status",[id,companyId,employeeId]);
    return r.rows[0] ?? null;
  }

  async bind(deviceId:string,agentId:string,permissions:string[]) {
    const r=await this.db.query(
      "INSERT INTO device_agent_bindings(device_id,agent_id,permissions,active) VALUES($1,$2,$3::jsonb,true) ON CONFLICT(device_id,agent_id) DO UPDATE SET permissions=EXCLUDED.permissions,active=true RETURNING device_id AS \"deviceId\",agent_id AS \"agentId\",permissions,active",
      [deviceId,agentId,JSON.stringify(permissions)],
    );
    return r.rows[0];
  }

  async unbind(deviceId:string,agentId:string) {
    await this.db.query("UPDATE device_agent_bindings SET active=false WHERE device_id=$1 AND agent_id=$2",[deviceId,agentId]);
  }

  async binding(deviceId:string,agentId:string) {
    const r=await this.db.query('SELECT device_id AS "deviceId",agent_id AS "agentId",permissions,active FROM device_agent_bindings WHERE device_id=$1 AND agent_id=$2 AND active=true',[deviceId,agentId]);
    return r.rows[0] ?? null;
  }

  async createCommand(input:{id:string;companyId:string;deviceId:string;agentId:string;action:string;arguments:Record<string,unknown>}) {
    const r=await this.db.query(
      'INSERT INTO device_commands(id,company_id,device_id,agent_id,action,arguments) VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING id,company_id AS "companyId",device_id AS "deviceId",agent_id AS "agentId",action,arguments,status,created_at AS "createdAt"',
      [input.id,input.companyId,input.deviceId,input.agentId,input.action,JSON.stringify(input.arguments)],
    );
    return r.rows[0];
  }

  async commandForDevice(id:string,deviceId:string) {
    const r=await this.db.query('SELECT id,company_id AS "companyId",device_id AS "deviceId",agent_id AS "agentId",action,arguments,status,result,approval_id AS "approvalId" FROM device_commands WHERE id=$1 AND device_id=$2',[id,deviceId]);
    return r.rows[0] ?? null;
  }

  async startCommand(id:string) {
    await this.db.query("UPDATE device_commands SET status='RUNNING',started_at=now() WHERE id=$1 AND status='QUEUED'",[id]);
  }

  async completeCommand(id:string,status:string,result:unknown) {
    await this.db.query("UPDATE device_commands SET status=$2,result=$3::jsonb,completed_at=now() WHERE id=$1",[id,status,JSON.stringify(result ?? null)]);
  }
}
