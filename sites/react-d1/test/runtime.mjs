import { Miniflare } from 'miniflare';
import { readFile, readdir } from 'node:fs/promises';
import http from 'node:http';
import { handle } from '../lib/handler.mjs';
export async function runtime(persist=false) {
  const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:{DB:'task-tracker-test'},d1Persist:persist});
  const db=await mf.getD1Database('DB');
  await db.prepare('CREATE TABLE IF NOT EXISTS __test_migrations (name TEXT PRIMARY KEY)').run();
  for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()) {
    if(await db.prepare('SELECT name FROM __test_migrations WHERE name = ?').bind(file).first())continue;
    const sql=await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8');
    for(const statement of sql.split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean)) await db.prepare(statement).run();
    await db.prepare('INSERT INTO __test_migrations (name) VALUES (?)').bind(file).run();
  }
  return {db,close:()=>mf.dispose()};
}
export function httpApp(db,trace=[]) {
  return http.createServer(async (req,res)=>{
    if(req.headers['x-p0-request-id'])trace.push({requestId:req.headers['x-p0-request-id'],path:req.url,sequence:trace.length+1});
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const response=await handle(new Request('http://localhost'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),db);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  });
}
