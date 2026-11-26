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
const rehearsalCookie = 'rofun_rehearsal'
function guestId(request) {
 const entry = request.headers.get('cookie')?.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith(rehearsalCookie + '='))
 const id = entry?.slice(rehearsalCookie.length + 1)
 return id && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ? id : null
}
export default {async fetch(request,env){
 const url=new URL(request.url)
 const path=url.pathname
 if(path==='/api/relic'){
  if(url.searchParams.get('mode')==='stage'&&!request.headers.get('oai-authenticated-user-id')){
   const guest=guestId(request)
   if(guest){
    const headers=new Headers(request.headers)
    headers.set('oai-authenticated-user-id','guest:'+guest)
    return market(new Request(request,{headers}),env.DB)
   }
  }
  return market(request,env.DB)
 }
 if(path==='/api/community')return community(request,env.DB)
 const asset=assets[path==='/'?'/index.html':path]
 if(!Array.isArray(asset))return new Response('Not found',{status:404})
 const headers=new Headers({'Content-Type':asset[0],'X-Content-Type-Options':'nosniff'})
 if(path==='/'||path==='/index.html'){
  headers.set('Cache-Control','private, no-store')
  if(!guestId(request)) headers.append('Set-Cookie',rehearsalCookie+'='+crypto.randomUUID()+'; Path=/; Secure; HttpOnly; SameSite=Lax')
 }
 return new Response(Uint8Array.from(atob(asset[1]),c=>c.charCodeAt(0)),{headers})
}}`)
