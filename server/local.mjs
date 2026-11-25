import {DatabaseSync} from 'node:sqlite'
import {readFileSync,readdirSync} from 'node:fs'
import {community,market} from './market.js'
export function database(){
 const db=new DatabaseSync(':memory:')
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+file,'utf8'))
 return {prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {first:()=>stmt.get(...args),all:()=>({results:stmt.all(...args)}),run:()=>({meta:stmt.run(...args)}),read:()=>sql.startsWith('SELECT')?{results:stmt.all(...args)}:{meta:stmt.run(...args)}}}}},
 batch(queries){db.exec('BEGIN IMMEDIATE');try{const res=queries.map(q=>q.read());db.exec('COMMIT');return res}catch(e){db.exec('ROLLBACK');throw e}}}
}
export function localMarket(){
 const db=database()
 return async(req,res,next)=>{
  const route=req.url.split('?')[0]
  const saved=req.headers.cookie?.match(/(?:^|; *)rofun_preview=([a-f0-9-]{36})(?:;|$)/i)?.[1]
  const visitor=saved??crypto.randomUUID()
  if(!saved)res.setHeader('Set-Cookie','rofun_preview='+visitor+'; Path=/; HttpOnly; SameSite=Lax')
  if(route!=='/api/relic'&&route!=='/api/community')return next()
  const buffers=[];for await(const part of req)buffers.push(part)
  const url='http://'+req.headers.host+req.url
  const previewPlayer=req.headers['x-rofun-preview-player']
  const identity=route==='/api/community'&&typeof previewPlayer==='string'&&/^[a-f0-9-]{36}$/i.test(previewPlayer)?previewPlayer:visitor
  const request=new Request(url,{method:req.method,headers:{...req.headers,'oai-authenticated-user-id':identity},body:req.method==='POST'?Buffer.concat(buffers):undefined})
  const handler=route==='/api/community'?community:market
  const result=await handler(request,db)
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text())
 }
}
