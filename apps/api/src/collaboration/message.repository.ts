import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service";
import { AgentTaskMessage } from "./message-bus.service";
@Injectable()
export class MessageRepository {
  constructor(private db:DatabaseService){}
  async create(message:AgentTaskMessage){
    const r=await this.db.query(`INSERT INTO messages(id,company_id,task_id,sender_agent_id,receiver_agent_id,type,payload)
      VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6::jsonb)
      RETURNING id,company_id AS "companyId",task_id AS "taskId",sender_agent_id AS "senderAgentId",receiver_agent_id AS "receiverAgentId",type,payload,created_at AS "createdAt"`,
      [message.companyId,message.taskId,message.senderAgentId,message.receiverAgentId,message.type,JSON.stringify(message.payload)]);
    return r.rows[0];
  }
  async listTask(taskId:string){
    const r=await this.db.query(`SELECT id,company_id AS "companyId",task_id AS "taskId",sender_agent_id AS "senderAgentId",receiver_agent_id AS "receiverAgentId",type,payload,created_at AS "createdAt" FROM messages WHERE task_id=$1 ORDER BY created_at`,[taskId]);
    return r.rows;
  }
}