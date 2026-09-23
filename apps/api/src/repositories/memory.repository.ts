import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Memory } from "../domain";
import { DatabaseService } from "../infrastructure/database.service";

@Injectable()
export class MemoryRepository {
  constructor(private readonly db: DatabaseService) {}

  async save(memory: Memory, embedding: number[]) {
    const id = memory.id || randomUUID();
    await this.db.query(
      `INSERT INTO memories(id,company_id,agent_id,scope,content,embedding)
       VALUES($1,$2,$3,$4,$5,$6::vector)
       ON CONFLICT(id) DO UPDATE SET content=EXCLUDED.content,scope=EXCLUDED.scope,embedding=EXCLUDED.embedding`,
      [id,memory.companyId,memory.agentId,memory.scope,memory.content,JSON.stringify(embedding)],
    );
    return { ...memory, id };
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

  async semanticSearch(agentId:string,embedding:number[],limit=5,scope?:string){
    const values=[agentId,JSON.stringify(embedding),limit];
    const scopeClause=scope ? " AND scope=$4" : "";
    if(scope) values.push(scope);
    const result=await this.db.query(
      `SELECT id,company_id AS "companyId",agent_id AS "agentId",scope,content,
              1-(embedding <=> $2::vector) AS score
       FROM memories
       WHERE agent_id=$1 AND embedding IS NOT NULL${scopeClause}
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
      values,
    );
    return result.rows;
  }
}