import { Repository } from '../db/repository.mjs';
import { operate } from './service.mjs';
import { HttpError } from './rules.mjs';
const writeTails=new WeakMap();
export async function handle(request,db) {
  const path=new URL(request.url).pathname;
  if(!['PATCH','DELETE'].includes(request.method)||!/^\/api\/tasks\/[^/]+(?:\/time)?$/.test(path))return execute(request,db);
  // Retain the original arrival-order contract within each Worker isolate.
  // Cross-isolate lost updates are separately prevented by the D1 revision CAS.
  let tails=writeTails.get(db);if(!tails){tails=new Map();writeTails.set(db,tails);}
  const key=path.replace(/\/time$/,'');
  const prior=tails.get(key)||Promise.resolve();
  const result=prior.then(()=>execute(request,db));
  const tail=result.catch(()=>{});tails.set(key,tail);
  try{return await result;}finally{if(tails.get(key)===tail)tails.delete(key);}
}
async function execute(request,db) {
  const path=new URL(request.url).pathname;
  try {
    let body={};
    if(['POST','PATCH'].includes(request.method)) {
      const text=await request.text();
      if(new TextEncoder().encode(text).length>1048576)throw new HttpError(413,'Request body must not exceed 1 MB.','PAYLOAD_TOO_LARGE');
      try { body=text?JSON.parse(text):{}; } catch {throw new HttpError(400,'Request body must contain valid JSON.','INVALID_JSON');}
      if(!body||typeof body!=='object'||Array.isArray(body))body={};
    }
    const result=await operate(new Repository(db),request.method,path,body);
    return Response.json(result,{status:request.method==='POST'?201:200,headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    if(!(error instanceof HttpError))console.error(error);
    return Response.json({error:{code:error.code||'INTERNAL_ERROR',message:error instanceof HttpError?error.message:'An unexpected server error occurred.'}},{status:error instanceof HttpError?error.status:500,headers:{'Cache-Control':'no-store'}});
  }
}
