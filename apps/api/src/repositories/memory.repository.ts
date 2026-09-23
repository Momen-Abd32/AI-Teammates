import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Memory } from "../domain";
import { DatabaseService } from "../infrastructure/database.service";

@Injectable()
export class MemoryRepository {
  constructor(private readonly db: DatabaseService) {}

  async save(memory: Memory) {
    const id = memory.id || randomUUID();
    await this.db.query(
      `INSERT INTO memories(id,company_id,agent_id,scope,content)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(id) DO UPDATE SET content=EXCLUDED.content,scope=EXCLUDED.scope`,
      [id,memory.companyId,memory.agentId,memory.scope,memory.content],
    );
    return {...memory,id};
  }

  async findByAgent(agentId: string) {
    const result = await this.db.query(
      "SELECT id,company_id AS \"companyId\",agent_id AS \"agentId\",scope,content FROM memories WHERE agent_id=$1 ORDER BY created_at DESC",
      [agentId],
    );
    return result.rows as Memory[];
  }

  async delete(agentId:string,id:string) {
    const result=await this.db.query("DELETE FROM memories WHERE id=$1 AND agent_id=$2",[id,agentId]);
    return (result.rowCount ?? 0)>0;
  }
}