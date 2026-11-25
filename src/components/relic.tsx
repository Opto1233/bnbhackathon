import {useEffect,useState} from 'react'
import {Bug,Crown,Eye,Gem} from 'lucide-react'
import {Button} from './ui/button'
import '../relic.css'
export type Item={id:string;name:string;listing:string|null;price:number|null;lastPrice:number|null}
export type Lot={id:string;item:string;name:string;seller:string;buyer:string;price:number}
export type Board={id:string;revision:number;cards:(number|null)[];matched:number[];moves:number;outcome:string;reward:string}
type Offer=Lot & {offerId:string;offerStatus:"requested"|"approved";unlockAt:number|null;expiresAt:number}
export type Snapshot={actor:string;balance:number;items:Item[];listings:Lot[];receipts:Lot[];offers:Offer[];expiredOffers:{offerId:string;name:string;expiresAt:number}[];run:Board|null;totals:{sales:number;platform:number;burned:number}}
export const cash=(n:number)=>(n/1e6).toLocaleString('en',{maximumFractionDigits:6})+' RELIC'
export async function requestRelic(mode:string,role:string,data?:Record<string,unknown>):Promise<Snapshot>{
 const res=await fetch('/api/relic?'+new URLSearchParams({mode,role}),data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store'})
 const body=await res.json();if(!res.ok)throw Error(body.error||'Market unavailable');return body
}
export function Split({price}:{price:number}){
 return <div className="relic-quote split-terms"><div><small>Buyer receives the relic</small><strong>Pays {cash(price)}</strong></div><div><small>Seller receives · 99%</small><strong>{cash(price*.99)}</strong></div><div><small>RoFun fee · 0.5%</small><strong>{cash(price*.005)}</strong></div><div><small>Burned · 0.5%</small><strong>{cash(price*.005)}</strong></div></div>
}
export function VaultBoard({run,busy,flip}:{run:Board;busy:boolean;flip:(i:number)=>void}){
 const icons=[Bug,Eye,Crown],names=['Scarab','Eye','Crown']
 return <><div className="relic-hud">Turns {run.moves}/7 · Pairs {run.matched.length/2}/3</div><div className="relic-board">{run.cards.map((v,i)=>{const Icon=v===null?Gem:icons[v];return <button key={i} className={'relic-tile '+(run.matched.includes(i)?'found':v!==null?'revealed':'')} aria-label={'Tile '+(i+1)+' '+(v===null?'hidden':names[v])} disabled={busy||run.outcome!=='Playing'||run.matched.includes(i)} onClick={()=>flip(i)}><Icon/><span>{v===null?'Seal '+(i+1):names[v]}</span></button>})}</div></>
}
function Room({mode,role}:{mode:string;role:string}){
 const [s,set]=useState<Snapshot|null>(null),[message,msg]=useState(''),[busy,lock]=useState(false),[price,ask]=useState('1'),[quote,review]=useState<Lot|null>(null)
 const [now,setNow]=useState(Date.now)
 useEffect(()=>{
  const timer=window.setInterval(()=>setNow(Date.now()),250)
  return ()=>window.clearInterval(timer)
 },[])
 useEffect(()=>{
  if(busy)return
  let active=true
  const poll=window.setInterval(()=>{if(!document.hidden)requestRelic(mode,role).then(result=>{if(active)set(result)}).catch(()=>{})},1800)
  return ()=>{active=false;clearInterval(poll)}
 },[mode,role,busy])
 const linked=mode==='shared'?location.hash.split('/')[3]:''
 const mentor=mode==='mentor'
 useEffect(()=>{
  if(linked&&s)document.getElementById('listing-'+linked)?.scrollIntoView({block:'center'})
 },[linked,!!s])
 async function refresh(){set(await requestRelic(mode,role))}
 useEffect(()=>{let live=true;requestRelic(mode,role).then(v=>{if(live)set(v)}).catch(e=>{if(live)msg(e.message)});return()=>{live=false}},[mode,role])
 async function action(data:Record<string,unknown>,notice=''){
  lock(true);try{set(await requestRelic(mode,role,data));msg(notice);review(null)}catch(e){msg(String((e as Error).message));await refresh().catch(()=>{})}finally{lock(false)}
 }
 async function race(lot:Lot){
  lock(true)
  try{
   const buyers=['Buyer A','Buyer B']
   const snapshots=await Promise.all(buyers.map(buyer=>requestRelic(mode,buyer,{action:'offer',id:lot.id,price:lot.price})))
   const offers=snapshots.map(value=>value.offers.find(offer=>offer.id===lot.id)!)
   for(const offer of offers)await requestRelic(mode,role,{action:'approve',id:offer.offerId})
   await new Promise(resolve=>window.setTimeout(resolve,3100))
   const results=await Promise.allSettled(buyers.map((buyer,index)=>requestRelic(mode,buyer,{action:'buy',id:lot.id,price:lot.price,offerId:offers[index].offerId})))
   msg(results.map((r,i)=>'Buyer '+(i?'B':'A')+' — '+(r.status==='fulfilled'?'purchased · '+cash(r.value.balance)+' remaining':r.reason.message)).join(' | '))
   await refresh();review(null)
  }catch(e){msg((e as Error).message)}finally{lock(false)}
 }
 const run=s?.run
 return <>{s&&<><section className="panel relic-game"><div className="relic-head"><h2>Relic Vale · The buried vault</h2></div><p>Uncover three matching pairs in seven turns to recover one tradable relic.</p>
 {run&&<VaultBoard run={run} busy={busy} flip={tile=>action({action:"flip",id:run.id,revision:run.revision,tile})}/>}
 {run?.outcome==='Won'&&<div className="success">Vault recovered · {run.reward} added to your inventory.</div>}{run?.outcome==='Lost'&&<p>The vault closed after seven turns.</p>}{run?.outcome!=='Playing'&&<Button disabled={busy} variant="primary" onClick={()=>action({action:'start'})}>{run?'Play again':'Enter the vault'}</Button>}</section>
 <section className="panel relic-market"><div className="section-title"><h2>Player marketplace</h2><Button disabled={busy} onClick={()=>refresh().catch(e=>msg(e.message))}>Refresh market</Button></div><p>{mentor?role:s.actor.slice(0,17)} · Market wallet <strong>{cash(s.balance)}</strong> · Virtual RELIC</p><p>Sales include a 1% fee. Half goes to RoFun and half is burned. Listed relics are locked. Request a trade, wait for seller approval, then confirm after reviewing the final terms. Only final confirmation transfers the relic and funds.</p>
 <h3 className="subhead">Your inventory</h3>{mentor&&role==='Seller'&&<Button disabled={busy} onClick={()=>action({action:'starter'},'Sample relic issued once per mentor room.')}>Claim sample relic</Button>}
 {!s.items.length&&<p>Complete the vault to earn a relic.</p>}{s.items.length>0&&<label className="field">Listing price in RELIC<input type="number" min=".01" max="100" step=".01" value={price} onChange={e=>ask(e.target.value)}/></label>}
 {s.items.map(i=><div className="list-row" key={i.id}><span>{i.name} · {i.id.slice(-8)} {i.listing&&<b className="badge yellow">Listed</b>}</span>{i.listing?<Button disabled={busy} onClick={()=>action({action:'cancel',id:i.listing},'Listing cancelled. Relic unlocked.')}>Cancel listing</Button>:<Button disabled={busy} onClick={()=>action({action:'list',item:i.id,price:Math.round(Number(price)*1e6)},'Relic locked and listed.')}>List relic</Button>}</div>)}
 <h3 className="subhead">Available listings</h3>{!s.listings.length&&<p>No relics listed yet.</p>}{linked&&!s.listings.some(l=>l.id===linked)&&<p role="status">This listing has closed or is unavailable.</p>}{s.listings.map(l=><div className={l.id===linked?'list-row success':'list-row'} id={'listing-'+l.id} key={l.id}><span>{l.name} · {l.item.slice(-8)}</span><strong>{cash(l.price)}</strong>{l.seller!==s.actor?<Button disabled={busy} onClick={()=>review(l)}>Review purchase</Button>:mentor&&role==='Seller'?<Button disabled={busy} onClick={()=>review(l)}>Test two buyers</Button>:<small>Your listing</small>}{!mentor&&<Button onClick={()=>location.hash='Social/'+l.id}>Share listing</Button>}</div>)}
 {quote&&<div className="panel"><h3>{quote.name} · {quote.item.slice(-8)}</h3><Split price={quote.price}/><Button variant="primary" disabled={busy} onClick={()=>quote.seller===s.actor?race(quote):action({action:'offer',id:quote.id,price:quote.price},'Trade requested. The seller must approve.')}>{quote.seller===s.actor?'Run simultaneous purchases':'Request trade'}</Button> <Button disabled={busy} onClick={()=>review(null)}>Back</Button></div>}
 <h3 className="subhead">Trade confirmations ({s.offers.filter(o=>o.expiresAt>now).length})</h3>
 {!s.offers.some(offer=>offer.expiresAt>now)&&<p>Waiting for trade requests. Updates appear automatically.</p>}
 {s.offers.filter(offer=>offer.expiresAt>now).map(offer=>{
  const isSeller=offer.seller===s.actor
  const approved=offer.offerStatus==='approved'
  const seconds=Math.max(0,Math.ceil(((offer.unlockAt??now)-now)/1000))
  return <article className="panel relic-sale" key={offer.offerId}>
   <h3>{offer.name} · {offer.item.slice(-8)}</h3>
   <p>Seller {offer.seller} · Buyer {offer.buyer}</p>
   <Split price={offer.price}/><small>Expires in {Math.max(0,Math.ceil((offer.expiresAt-now)/1000))}s · Review the item and total before confirming.</small>
   <p>{approved?'Seller approved · awaiting buyer confirmation':'Buyer requested · awaiting seller approval'}</p>
   <p>Acting as {s.actor}</p><div className="filters">
    {isSeller&&!approved&&<Button variant="primary" disabled={busy} onClick={()=>action({action:'approve',id:offer.offerId},'Approved. Waiting for the buyer’s final confirmation.')}>Approve trade</Button>}
    {!isSeller&&approved&&<Button variant="primary" disabled={busy||seconds>0} onClick={()=>action({action:'buy',id:offer.id,offerId:offer.offerId,price:offer.price},'Purchase settled.')}>{seconds>0?'Review for '+seconds+'s':'Confirm final trade'}</Button>}
    <Button disabled={busy} onClick={()=>action({action:'closeOffer',id:offer.offerId},'Trade request closed.')}>{isSeller?'Decline trade':'Withdraw request'}</Button>
   </div>
  </article>
 })}
 {s.expiredOffers?.map(o=><p key={o.offerId}>{o.name} · Expired · Send a new request to continue.</p>)}
 <h3 className="subhead">Settlement receipts</h3>{s.receipts.map(l=><details key={l.id} open><summary>{l.name} · Settled</summary><p>Seller {l.seller} → Buyer {l.buyer} · Relic {l.item.slice(-8)}</p><Split price={l.price}/><small>Receipt {l.id}</small>{(mentor||l.buyer===s.actor)&&<Button onClick={()=>location.hash=['Portfolio',mentor?'mentor-'+l.buyer:'shared',l.item].map(encodeURIComponent).join('/')}>View item in Portfolio</Button>}</details>)}<p>{s.totals.sales} settled sales · Burned {cash(s.totals.burned)} · RoFun treasury {cash(s.totals.platform)}</p></section></>}
 {message&&<div className="warning" role="status">{message}</div>}{!s&&<Button onClick={()=>refresh().catch(e=>msg(e.message))}>{message?'Retry connection':'Connecting…'}</Button>}
 {mentor&&s&&<Button disabled={busy} onClick={()=>{if(window.confirm('Reset this private mentor room and its three wallets?'))void action({action:'reset'},'Mentor room reset.')}}>Reset mentor room</Button>}</>
}
export function Relic(){
 const [mode,select]=useState('shared'),[role,setRole]=useState('Seller')
 return <><section className="panel"><h2>Relic Vale</h2><div className="filters">{['shared','mentor'].map(m=><button key={m} className={mode===m?'selected':''} onClick={()=>select(m)}>{m==='shared'?'Shared player market':'Try a P2P trade'}</button>)}</div>{mode==='mentor'?<><p>Your private demo room has three simulated traders, each starting with 2 virtual RELIC. As Seller, claim a relic, list it for 1 RELIC, then test two buyers.</p><div className="filters" aria-label="Demo trader">{['Seller','Buyer A','Buyer B'].map(r=><button key={r} aria-pressed={r===role} className={r===role?'selected':''} onClick={()=>setRole(r)}>{r}</button>)}</div></>:<p>Play and trade with signed-in players. Each account starts with 2 virtual RELIC in its Relic Vale market wallet.</p>}</section><Room key={mode+role} mode={mode} role={role}/></>
}
