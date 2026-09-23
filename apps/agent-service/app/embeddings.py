import os
try:
 from openai import OpenAI
except ImportError: OpenAI=None
def embed(text:str):
 if OpenAI and os.getenv("OPENAI_API_KEY"):
  return OpenAI().embeddings.create(model=os.getenv("EMBEDDING_MODEL","text-embedding-3-small"),input=text).data[0].embedding
 return None
