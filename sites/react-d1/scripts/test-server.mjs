import { runtime } from '../test/runtime.mjs';
import { handle } from '../lib/handler.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function startServer(port,persist=false) {
const {db,close}=await runtime(persist);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server=createServer(async(req,res)=>{
  try {
    if(req.url.startsWith('/api/')) {
      const chunks=[];for await(const c of req)chunks.push(c);
      const result=await handle(new Request('http://localhost'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),db);
      res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
    }
    const name=new URL(req.url,'http://localhost').pathname;
    const filename=path.resolve('public','.'+(name==='/'?'/react/index.html':name));
    if(!filename.startsWith(path.resolve('public')+path.sep))throw new Error('Invalid path');
    res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'});res.end(await readFile(filename));
  }catch {res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
return {server,close:async()=>{await new Promise(resolve=>server.close(resolve));await close();}};
}
if(process.argv[1]===new URL(import.meta.url).pathname.slice(1).replaceAll('/','\\')) {
 const instance=await startServer(Number(process.env.PORT||3000),process.env.TASK_TRACKER_DB?path.resolve(process.env.TASK_TRACKER_DB+'.d1'):false);
 process.on('SIGTERM',async()=>{await instance.close();process.exit(0);});
}
