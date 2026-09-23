export interface AppConfig {
  nodeEnv:string;
  apiPort:number;
  webPort:number;
  databaseUrl:string;
  redisUrl:string;
  agentServiceUrl:string;
  llmModel:string;
}

function numberEnv(name:string,fallback:number):number {
  const value=Number(process.env[name] ?? fallback);
  if(!Number.isFinite(value)) throw new Error(`Invalid numeric environment variable: ${name}`);
  return value;
}

export function loadConfig():AppConfig {
  const databaseUrl=process.env.DATABASE_URL;
  const redisUrl=process.env.REDIS_URL;
  const agentServiceUrl=process.env.AGENT_SERVICE_URL;
  if(!databaseUrl || !redisUrl || !agentServiceUrl) {
    throw new Error("DATABASE_URL, REDIS_URL and AGENT_SERVICE_URL are required");
  }
  return {
    nodeEnv:process.env.NODE_ENV ?? "development",
    apiPort:numberEnv("API_PORT",3001),
    webPort:numberEnv("WEB_PORT",3000),
    databaseUrl,
    redisUrl,
    agentServiceUrl,
    llmModel:process.env.LLM_MODEL ?? "gpt-5"
  };
}
