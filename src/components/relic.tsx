import {useEffect,useState} from 'react'
import {Bug,Crown,Eye,Gem} from 'lucide-react'
import {Button} from './ui/button'
import '../relic.css'
type Item={id:string;name:string;listing:string|null;price:number}
type Lot={id:string;item:string;name:string;seller:string;buyer:string;price:number}
type Board={id:string;revision:number;cards:(number|null)[];matched:number[];moves:number;outcome:string;reward:string}
type Snapshot={actor:string;balance:number;items:Item[];listings:Lot[];receipts:Lot[];run:Board|null;totals:{sales:number;platform:number;burned:number}}
const cash=(n:number)=>(n/1e6).toLocaleString('en',{maximumFractionDigits:6})+' RELIC'
async function request(mode:string,role:string,data?:Record<string,unknown>):Promise<Snapshot>{
 const res=await fetch('/api/relic?'+new URLSearchParams({mode,role}),data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store'})
 const body=await res.json();if(!res.ok)throw Error(body.error||'Market unavailable');return body
}
function Split({price}:{price:number}){
 return <div className="relic-quote">Buyer pays <b>{cash(price)}</b> · Seller gets <b>{cash(price*.99)}</b> · Burned {cash(price*.005)} · RoFun {cash(price*.005)}</div>
}
function Room({mode,role}:{mode:string;role:string}){
 const [s,set]=useState<Snapshot|null>(null),[message,msg]=useState(''),[busy,lock]=useState(false),[price,ask]=useState('1'),[quote,review]=useState<Lot|null>(null)
 const mentor=mode==='mentor'
 async function refresh(){set(await request(mode,role))}
 useEffect(()=>{let live=true;request(mode,role).then(v=>{if(live)set(v)}).catch(e=>{if(live)msg(e.message)});return()=>{live=false}},[mode,role])
 async function action(data:Record<string,unknown>,notice=''){
  lock(true);try{set(await request(mode,role,data));msg(notice);review(null)}catch(e){msg(String((e as Error).message));await refresh().catch(()=>{})}finally{lock(false)}
 }
 async function race(lot:Lot){
  lock(true)
  try{
   const results=await Promise.allSettled(['Buyer A','Buyer B'].map(buyer=>request(mode,buyer,{action:'buy',id:lot.id,price:lot.price})))
   msg(results.map((r,i)=>'Buyer '+(i?'B':'A')+' — '+(r.status==='fulfilled'?'purchased · '+cash(r.value.balance)+' remaining':r.reason.message)).join(' | '))
   await refresh();review(null)
  }catch(e){msg((e as Error).message)}finally{lock(false)}
 }
 const run=s?.run,icons=[Bug,Eye,Crown],names=['Scarab','Eye','Crown']
 return <>{s&&<><section className="panel relic-game"><div className="relic-head"><h2>Relic Vale · The buried vault</h2></div><p>Uncover three matching pairs in seven turns to recover one tradable relic.</p>
 {run&&<><div className="relic-hud">Turns {run.moves}/7 · Pairs {run.matched.length/2}/3</div><div className="relic-board">{run.cards.map((v,i)=>{const Icon=v===null?Gem:icons[v];return <button key={i} className={'relic-tile '+(run.matched.includes(i)?'found':v!==null?'revealed':'')} aria-label={'Tile '+(i+1)+' '+(v===null?'hidden':names[v])} disabled={busy||run.outcome!=='Playing'||run.matched.includes(i)} onClick={()=>action({action:'flip',id:run.id,revision:run.revision,tile:i})}><Icon/><span>{v===null?'Seal '+(i+1):names[v]}</span></button>})}</div></>}
 {run?.outcome==='Won'&&<div className="success">Vault recovered · {run.reward} added to your inventory.</div>}{run?.outcome==='Lost'&&<p>The vault closed after seven turns.</p>}{run?.outcome!=='Playing'&&<Button disabled={busy} variant="primary" onClick={()=>action({action:'start'})}>{run?'Play again':'Enter the vault'}</Button>}</section>
 <section className="panel relic-market"><div className="section-title"><h2>Player marketplace</h2><Button disabled={busy} onClick={()=>refresh().catch(e=>msg(e.message))}>Refresh market</Button></div><p>{mentor?role:s.actor.slice(0,17)} · Market wallet <strong>{cash(s.balance)}</strong> · Virtual RELIC</p><p>Sales include a 1% fee. Half goes to RoFun and half is burned. Listed relics are locked. Confirming a purchase transfers the relic and settles all balances together.</p>
 <h3 className="subhead">Your inventory</h3>{mentor&&role==='Seller'&&<Button disabled={busy} onClick={()=>action({action:'starter'},'Sample relic issued once per mentor room.')}>Claim sample relic</Button>}
 {!s.items.length&&<p>Complete the vault to earn a relic.</p>}{s.items.length>0&&<label className="field">Listing price in RELIC<input type="number" min=".01" max="100" step=".01" value={price} onChange={e=>ask(e.target.value)}/></label>}
 {s.items.map(i=><div className="list-row" key={i.id}><span>{i.name} · {i.id.slice(-8)}</span>{i.listing?<Button disabled={busy} onClick={()=>action({action:'cancel',id:i.listing},'Listing cancelled. Relic unlocked.')}>Cancel listing</Button>:<Button disabled={busy} onClick={()=>action({action:'list',item:i.id,price:Math.round(Number(price)*1e6)},'Relic locked and listed.')}>List relic</Button>}</div>)}
 <h3 className="subhead">Available listings</h3>{!s.listings.length&&<p>No relics listed yet.</p>}{s.listings.map(l=><div className="list-row" key={l.id}><span>{l.name} · {l.item.slice(-8)}</span><strong>{cash(l.price)}</strong>{l.seller!==s.actor?<Button disabled={busy} onClick={()=>review(l)}>Review purchase</Button>:mentor&&role==='Seller'?<Button disabled={busy} onClick={()=>review(l)}>Test two buyers</Button>:<small>Your listing</small>}</div>)}
 {quote&&<div className="panel"><h3>{quote.name} · {quote.item.slice(-8)}</h3><Split price={quote.price}/><Button variant="primary" disabled={busy} onClick={()=>quote.seller===s.actor?race(quote):action({action:'buy',id:quote.id,price:quote.price},'Purchase settled.')}>{quote.seller===s.actor?'Run simultaneous purchases':'Confirm purchase'}</Button> <Button disabled={busy} onClick={()=>review(null)}>Back</Button></div>}
 <h3 className="subhead">Settlement receipts</h3>{s.receipts.map(l=><details key={l.id} open><summary>{l.name} · Settled</summary><p>Seller {l.seller} → Buyer {l.buyer} · Relic {l.item.slice(-8)}</p><Split price={l.price}/><small>Receipt {l.id}</small></details>)}<p>{s.totals.sales} settled sales · Burned {cash(s.totals.burned)} · RoFun treasury {cash(s.totals.platform)}</p></section></>}
 {message&&<div className="warning" role="status">{message}</div>}{!s&&<Button onClick={()=>refresh().catch(e=>msg(e.message))}>{message?'Retry connection':'Connecting…'}</Button>}
 {mentor&&s&&<Button disabled={busy} onClick={()=>{if(window.confirm('Reset this private mentor room and its three wallets?'))void action({action:'reset'},'Mentor room reset.')}}>Reset mentor room</Button>}</>
}
export function Relic(){
 const [mode,select]=useState('shared'),[role,setRole]=useState('Seller')
 return <><section className="panel"><h2>Relic Vale</h2><div className="filters">{['shared','mentor'].map(m=><button key={m} className={mode===m?'selected':''} onClick={()=>select(m)}>{m==='shared'?'Shared player market':'Mentor demo'}</button>)}</div>{mode==='mentor'?<><p>Your private demo room has three simulated traders, each starting with 2 virtual RELIC. As Seller, claim a relic, list it for 1 RELIC, then test two buyers.</p><label className="field selector">Demo trader<select value={role} onChange={e=>setRole(e.target.value)}>{['Seller','Buyer A','Buyer B'].map(r=><option key={r}>{r}</option>)}</select></label></>:<p>Play and trade with signed-in players. Each account starts with 2 virtual RELIC in its Relic Vale market wallet.</p>}</section><Room key={mode+role} mode={mode} role={role}/></>
}
