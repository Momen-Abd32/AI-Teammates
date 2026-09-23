const API=process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001/api";
const KEY="ai-teammates-access-token";

export function getToken(){return typeof window==="undefined"?null:localStorage.getItem(KEY);}
export function setToken(token:string){localStorage.setItem(KEY,token);}
export function clearToken(){localStorage.removeItem(KEY);}

export async function apiFetch(path:string,init:RequestInit={}) {
  const headers=new Headers(init.headers);
  const token=getToken();
  if(token) headers.set("Authorization","Bearer "+token);
  if(init.body && !headers.has("content-type")) headers.set("content-type","application/json");
  const response=await fetch(API+path,{...init,headers});
  if(response.status===401 && typeof window!=="undefined") clearToken();
  return response;
}
