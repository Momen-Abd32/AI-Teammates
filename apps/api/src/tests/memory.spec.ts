import { MemoryService } from "../memory/memory.service";

describe("memory rules",()=>{
  const org:any={agents:jest.fn().mockResolvedValue([{id:"a",employeeId:"e"}])};
  const repo:any={save:jest.fn(),findByAgent:jest.fn(),delete:jest.fn(),semanticSearch:jest.fn()};
  const embeddings:any={embed:jest.fn().mockResolvedValue(new Array(1536).fill(0))};

  beforeEach(()=>{
    jest.clearAllMocks();
    org.agents.mockResolvedValue([{id:"a",employeeId:"e"}]);
    embeddings.embed.mockResolvedValue(new Array(1536).fill(0));
  });

  it("rejects empty memory",async()=>{
    const s=new MemoryService(repo,org,embeddings);
    await expect(s.create({companyId:"c",agentId:"a",scope:"PRIVATE",content:" "},"e")).rejects.toThrow();
    expect(embeddings.embed).not.toHaveBeenCalled();
  });

  it("rejects restricted credential content",async()=>{
    const s=new MemoryService(repo,org,embeddings);
    await expect(s.create({companyId:"c",agentId:"a",scope:"PRIVATE",content:"my API key is abc"},"e")).rejects.toThrow();
    expect(embeddings.embed).not.toHaveBeenCalled();
  });

  it("embeds safe work memory before saving",async()=>{
    repo.save.mockResolvedValue({id:"m",companyId:"c",agentId:"a",scope:"PRIVATE",content:"Use TypeScript strict mode"});
    const s=new MemoryService(repo,org,embeddings);
    await s.create({companyId:"c",agentId:"a",scope:"PRIVATE",content:"Use TypeScript strict mode"},"e");
    expect(embeddings.embed).toHaveBeenCalledWith("Use TypeScript strict mode");
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({companyId:"c",agentId:"a"}),expect.any(Array));
  });

  it("semantic search embeds the query and scopes to the agent",async()=>{
    repo.semanticSearch.mockResolvedValue([{id:"m",score:0.9}]);
    const s=new MemoryService(repo,org,embeddings);
    const result=await s.semanticSearch("c","e","a","how do I structure APIs",5,"PRIVATE");
    expect(embeddings.embed).toHaveBeenCalledWith("how do I structure APIs");
    expect(repo.semanticSearch).toHaveBeenCalledWith("a",expect.any(Array),5,"PRIVATE");
    expect(result).toEqual([{id:"m",score:0.9}]);
  });
});