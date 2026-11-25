// Each sold listing is the immutable journal entry for ownership and all four transfers.
const startingFunds=2_000_000
const owner=`COALESCE((SELECT l.buyer FROM relic_listings l WHERE l.item=i.id AND l.status='sold' ORDER BY l.rowid DESC LIMIT 1),i.mintedTo)`
const wallet=`(? + (SELECT COALESCE(SUM(price*99/100),0) FROM relic_listings WHERE room=? AND seller=? AND status='sold')
 - (SELECT COALESCE(SUM(price),0) FROM relic_listings WHERE room=? AND buyer=? AND status='sold'))`
const walletArgs=(room,actor)=>[startingFunds,room,actor,room,actor]
const names=['Amber Scarab','Moonstone Eye','Verdant Crown']
const roles=['Seller','Buyer A','Buyer B']
const listingCols='l.id,l.item,i.name,l.seller,l.buyer,l.price,l.soldAt,l.status'
const joinListings=' FROM relic_listings l JOIN relic_items i ON i.id=l.item '
const noCache={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
class MarketError extends Error{constructor(status,message){super(message);this.status=status}}
function check(test,message,status=409){if(!test)throw new MarketError(status,message)}
const statement=(db,sql,...args)=>db.prepare(sql).bind(...args)
const one=(db,sql,...args)=>statement(db,sql,...args).first()
const changed=r=>r.meta.changes===1
async function playerCode(id){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))
 return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')
}
function publicRun(row){
 if(!row)return null
 const s=JSON.parse(row.data)
 const visible=new Set([...s.matched,...s.shown])
 return {id:row.id,revision:row.revision,moves:s.moves,matched:s.matched,cards:s.deck.map((v,i)=>visible.has(i)?v:null),outcome:s.outcome,reward:s.outcome==='Won'?s.reward:null}
}
async function snapshot(db,room,actor){
 const result=await db.batch([
  statement(db,'SELECT '+wallet+' AS balance',...walletArgs(room,actor)),
  statement(db,`SELECT i.id,i.name,l.id AS listing,l.price FROM relic_items i LEFT JOIN relic_listings l ON l.item=i.id AND l.status='open' WHERE i.room=? AND ${owner}=? ORDER BY i.rowid DESC`,room,actor),
  statement(db,'SELECT '+listingCols+joinListings+" WHERE l.room=? AND l.status='open' ORDER BY l.rowid DESC LIMIT 100",room),
  statement(db,'SELECT '+listingCols+joinListings+" WHERE l.room=? AND l.status='sold' AND (l.buyer=? OR l.seller=?) ORDER BY l.soldAt DESC LIMIT 50",room,actor,actor),
  statement(db,'SELECT * FROM relic_runs WHERE room=? AND player=?',room,actor),
  statement(db,"SELECT COUNT(*) AS sales,COALESCE(SUM(price),0) AS volume,COALESCE(SUM(price/200),0) AS platform,COALESCE(SUM(price/200),0) AS burned FROM relic_listings WHERE room=? AND status='sold'",room)
 ])
 return {actor,balance:result[0].results[0].balance,items:result[1].results,listings:result[2].results,receipts:result[3].results,run:publicRun(result[4].results[0]),totals:result[5].results[0]}
}
function shuffled(){
 const values=[0,0,1,1,2,2]
 for(let i=values.length-1;i>0;i--){
  const n=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1)
  ;[values[i],values[n]]=[values[n],values[i]]
 }
 return values
}
async function act(db,room,actor,b,mentor){
 const exec=(sql,...args)=>statement(db,sql,...args).run()
 if(b.action==='start'){
  const run={deck:shuffled(),moves:0,matched:[],shown:[],outcome:'Playing',reward:names[crypto.getRandomValues(new Uint8Array(1))[0]%3]}
  await exec(`INSERT INTO relic_runs (id,room,player,revision,data) VALUES (?,?,?,0,?) ON CONFLICT(room,player) DO UPDATE SET id=excluded.id, revision=0,data=excluded.data WHERE json_extract(relic_runs.data,'$.outcome')!='Playing'`,crypto.randomUUID(),room,actor,JSON.stringify(run))
  return
 }
 if(b.action==='flip'){
  const row=await one(db,'SELECT * FROM relic_runs WHERE room=? AND player=? AND id=?',room,actor,b.id)
  check(row&&row.revision===b.revision,'Board changed. Use the latest tiles.')
  const s=JSON.parse(row.data),tile=b.tile
  check(s.outcome==='Playing'&&Number.isInteger(tile)&&tile>=0&&tile<6&&!s.matched.includes(tile),'Choose an unrecovered tile.')
  if(s.shown.length===2)s.shown=[]
  check(!s.shown.includes(tile),'Choose a different tile.')
  s.shown.push(tile)
  if(s.shown.length===2){
   s.moves++
   if(s.deck[s.shown[0]]===s.deck[tile])s.matched.push(...s.shown)
   if(s.matched.length===6)s.outcome='Won'
   else if(s.moves>=7)s.outcome='Lost'
  }
  const changes=[statement(db,'UPDATE relic_runs SET data=?,revision=revision+1 WHERE id=? AND room=? AND player=? AND revision=?',JSON.stringify(s),row.id,room,actor,row.revision)]
  if(s.outcome==='Won')changes.push(statement(db,`INSERT OR IGNORE INTO relic_items(id,room,mintedTo,name) SELECT id,room,player,json_extract(data,'$.reward') FROM relic_runs WHERE id=? AND room=? AND player=? AND json_extract(data,'$.outcome')='Won'`,row.id,room,actor))
  const results=await db.batch(changes)
  check(changed(results[0]),'Board changed. Use the latest tiles.')
  return
 }
 if(b.action==='starter'){
  check(mentor&&actor==='Seller','Only the mentor seller can claim the sample relic.',403)
  await exec('INSERT OR IGNORE INTO relic_items(id,room,mintedTo,name) VALUES (?,?,?,?)','sample-'+room,room,actor,'Amber Scarab')
  return
 }
 if(b.action==='list'){
  check(typeof b.item==='string'&&Number.isSafeInteger(b.price)&&b.price>=10000&&b.price<=100_000_000&&b.price%10000===0,'Enter 0.01–100 RELIC in steps of 0.01.',400)
  const r=await exec(`INSERT OR IGNORE INTO relic_listings(id,room,item,seller,price) SELECT ?,i.room,i.id,?,? FROM relic_items i WHERE i.room=? AND i.id=? AND ${owner}=?`,crypto.randomUUID(),actor,b.price,room,b.item,actor)
  check(changed(r),'Only an available relic in your inventory can be listed.')
  return
 }
 if(b.action==='cancel'){
  const r=await exec("UPDATE relic_listings SET status='cancelled' WHERE id=? AND room=? AND seller=? AND status='open'",b.id,room,actor)
  check(changed(r),'Listing already closed or belongs to another seller.');return
 }
 if(b.action==='buy'){
  check(typeof b.id==='string'&&Number.isSafeInteger(b.price),'Invalid purchase quote.',400)
  const r=await exec(`UPDATE relic_listings SET status='sold',buyer=?,soldAt=? WHERE id=? AND room=? AND price=? AND seller<>? AND status='open' AND price<=${wallet}`,actor,Date.now(),b.id,room,b.price,actor,...walletArgs(room,actor))
  if(!changed(r)){
   const prior=await one(db,'SELECT buyer,status,price,seller FROM relic_listings WHERE id=? AND room=?',b.id,room)
   if(prior?.buyer===actor&&prior.status==='sold'&&prior.price===b.price)return
   check(prior?.status==='open','Listing closed. No funds taken.')
   check(prior.seller!==actor,'You own this listing. No funds taken.')
   check(prior.price===b.price,'Quote changed. No funds taken.')
   throw new MarketError(409,'Insufficient market balance. No funds taken.')
  }
  return
 }
 if(b.action==='reset'){
  check(mentor,'Reset is only available in your private mentor room.',403)
  await db.batch(['relic_listings','relic_items','relic_runs'].map(table=>statement(db,'DELETE FROM '+table+' WHERE room=?',room)))
  return
 }
 throw new MarketError(400,'Unknown action.')
}
export async function market(request,db){
 const json=(body,status=200)=>Response.json(body,{status,headers:noCache})
 try{
  const user=request.headers.get('oai-authenticated-user-id')
  check(user,'Sign in to play and trade.',401)
  const url=new URL(request.url),mode=url.searchParams.get('mode')??'shared'
  check(['shared','mentor'].includes(mode),'Unknown market.',400)
  const mentor=mode==='mentor',key=await playerCode(user)
  const actor=mentor?(url.searchParams.get('role')??'Seller'):'Explorer-'+key.slice(0,32)
  check(!mentor||roles.includes(actor),'Unknown mentor role.',400)
  const room=mentor?'relic-v2-mentor-'+key:'relic-v2-shared'
  if(request.method==='POST'){
   check(request.headers.get('origin')===url.origin&&request.headers.get('content-type')?.startsWith('application/json'),'Use the same-origin game client.',403)
   const raw=await request.text();check(raw.length<=2048,'Request too large.',413)
   let data;try{data=JSON.parse(raw)}catch{throw new MarketError(400,'Invalid request.')}
   check(data&&typeof data==='object'&&typeof data.action==='string','Invalid action.',400)
   if(['flip','cancel'].includes(data.action))check(typeof data.id==='string','Missing record ID.',400)
   await act(db,room,actor,data,mentor)
  }else check(request.method==='GET','Method unavailable.',405)
  return json(await snapshot(db,room,actor))
 }catch(e){return json({error:e instanceof MarketError?e.message:'Market unavailable. Refresh to confirm the latest ledger.'},e instanceof MarketError?e.status:503)}
}
