import base64,io,uuid
import docker
from fastapi import FastAPI,HTTPException
from pydantic import BaseModel,Field

app=FastAPI(title="AI Teammates Sandbox Worker")
client=docker.from_env()
IMAGES={"python":"python:3.12-alpine","node":"node:22-alpine"}
COMMANDS={"python":["python","/workspace/main.py"],"node":["node","/workspace/main.js"]}

class ExecuteRequest(BaseModel):
    agent_id:str
    language:str
    code:str=Field(min_length=1,max_length=20000)

@app.get("/health")
def health(): return {"status":"ok"}

@app.post("/execute")
def execute(req:ExecuteRequest):
    if req.language not in IMAGES: raise HTTPException(403,"Language not allowed")
    name="ai-teammates-sandbox-"+uuid.uuid4().hex
    filename="/workspace/main.py" if req.language=="python" else "/workspace/main.js"
    script=base64.b64encode(req.code.encode()).decode()
    cmd=["sh","-c",f"mkdir -p /workspace && echo {script} | base64 -d > {filename} && {' '.join(COMMANDS[req.language])}"]
    container=None
    try:
        container=client.containers.run(IMAGES[req.language],cmd,name=name,detach=True,
          network_disabled=True,mem_limit="128m",nano_cpus=500_000_000,pids_limit=64,
          read_only=True,cap_drop=["ALL"],security_opt=["no-new-privileges"],
          tmpfs={"/tmp":"rw,noexec,nosuid,size=16m"},user="65532:65532")
        try: result=container.wait(timeout=10)
        except Exception:
            try: container.kill()
            except Exception: pass
            raise HTTPException(408,"Sandbox execution timed out")
        logs=container.logs(stdout=True,stderr=False).decode(errors="replace")
        errors=container.logs(stdout=False,stderr=True).decode(errors="replace")
        return {"agent_id":req.agent_id,"status":"COMPLETED" if result.get("StatusCode")==0 else "FAILED","stdout":logs,"stderr":errors}
    finally:
        if container:
            try: container.remove(force=True)
            except Exception: pass
