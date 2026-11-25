import {DatabaseSync} from 'node:sqlite'
import {readFileSync,readdirSync} from 'node:fs'
import {market} from './market.js'
export function database(){
 const db=new DatabaseSync(':memory:')
 for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+file,'utf8'))
 return {prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {first:()=>stmt.get(...args),run:()=>({meta:stmt.run(...args)}),read:()=>sql.startsWith('SELECT')?{results:stmt.all(...args)}:{meta:stmt.run(...args)}}}}},
 batch(queries){db.exec('BEGIN IMMEDIATE');try{const res=queries.map(q=>q.read());db.exec('COMMIT');return res}catch(e){db.exec('ROLLBACK');throw e}}}
}
export function localMarket(){
 const db=database()
 return async(req,res,next)=>{
  if(req.url.split('?')[0]!=='/api/relic')return next()
  const buffers=[];for await(const part of req)buffers.push(part)
  const url='http://'+req.headers.host+req.url
  const request=new Request(url,{method:req.method,headers:{...req.headers,'oai-authenticated-user-id':'local-preview'},body:req.method==='POST'?Buffer.concat(buffers):undefined})
  const result=await market(request,db)
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text())
 }
}
