import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises'
const assets={}
const mime={js:'text/javascript',css:'text/css',html:'text/html',webp:'image/webp'}
for(const file of await readdir('dist/client',{recursive:true,withFileTypes:true})){
 if(!file.isFile())continue
 const path=file.parentPath+'/'+file.name
 assets[path.slice('dist/client'.length)]=[mime[file.name.split('.').pop()]||'application/octet-stream',(await readFile(path)).toString('base64')]
}
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true})
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'))
await writeFile('dist/server/index.js',(await readFile('server/market.js','utf8'))+'\nconst assets='+JSON.stringify(assets)+`
export default {async fetch(request,env){
 const path=new URL(request.url).pathname
 if(path==='/api/relic')return market(request,env.DB)
 const asset=assets[path==='/'?'/index.html':path]
 if(!Array.isArray(asset))return new Response('Not found',{status:404})
 return new Response(Uint8Array.from(atob(asset[1]),c=>c.charCodeAt(0)),{headers:{'Content-Type':asset[0],'X-Content-Type-Options':'nosniff'}})
}}`)
