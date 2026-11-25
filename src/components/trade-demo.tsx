import {useEffect,useRef,useState} from 'react'
import {Gem,Check,Lock} from 'lucide-react'
import {Button} from './ui/button'
import {cash,requestRelic,Split,VaultBoard,type Snapshot} from './relic'
import {TestnetProof} from './testnet-proof'
import './trade-demo.css'

const buyers=['Buyer A','Buyer B']
const roles=['Seller',...buyers]
const call=(role:string,data?:Record<string,unknown>)=>requestRelic('stage',role,data)
async function readRoom(){
 const snapshots=await Promise.all(roles.map(role=>call(role)))
 return Object.fromEntries(snapshots.map(s=>[s.actor,s])) as Record<string,Snapshot>
}
export function TradeDemo(){
 const [room,setRoom]=useState<Record<string,Snapshot>>({})
 const [busy,setBusy]=useState(false),[error,report]=useState(''),[now,setNow]=useState(Date.now)
 const [reset,confirmReset]=useState(false)
 const working=useRef(false)
 const seller=room.Seller,lot=seller?.listings[0],sale=seller?.receipts[0]
 const item=seller?.items[0],run=seller?.run
 const offers=buyers.map(role=>room[role]?.offers.find(o=>o.id===lot?.id&&o.expiresAt>now))
 const requested=offers.every(Boolean),approved=requested&&offers.every(o=>o?.offerStatus==='approved')
 const wait=Math.max(0,...offers.map(o=>Math.ceil(((o?.unlockAt??0)-now)/1000)))
 const step=sale?4:approved?3:requested?2:lot?1:0
 useEffect(()=>{
  let active=true
  readRoom().then(v=>{if(active)setRoom(v)}).catch(e=>{if(active)report(e.message)})
  const timer=setInterval(()=>setNow(Date.now()),250)
  return ()=>{active=false;clearInterval(timer)}
 },[])
 async function perform(job:()=>Promise<unknown>){
  if(working.current)return
  working.current=true;setBusy(true);report('')
  try{await job()}catch(e){report((e as Error).message)}
  try{setRoom(await readRoom())}catch(e){report((e as Error).message)}
  setNow(Date.now());working.current=false;setBusy(false)
 }
 async function prepare(){
  const inventory=item?seller:await call('Seller',{action:'starter'})
  await call('Seller',{action:'list',item:inventory.items[0].id,price:1_000_000})
 }
 async function settle(){
  const results=await Promise.allSettled(buyers.map((role,i)=>call(role,{action:'buy',id:lot.id,price:lot.price,offerId:offers[i]!.offerId})))
  if(results.every(result=>result.status==='rejected'))throw new Error('Neither purchase settled. Review the current requests and balances.')
 }
 const status=['Recover or select a relic','Request trade','Seller approval','Buyer confirmation','Settled']
 return <div className="trade-stage"><div className="heading"><div><h1>Relic Vale trade demo</h1><p>Private rehearsal · three virtual wallets · settlement in RELIC</p></div><Button disabled={busy} onClick={()=>confirmReset(true)}>Restart demo</Button></div>
 {reset&&<div className="warning">Reset this rehearsal’s relics, offers and wallets?<Button disabled={busy} onClick={()=>perform(async()=>{await call('Seller',{action:'reset'});confirmReset(false)})}>Reset rehearsal</Button><Button onClick={()=>confirmReset(false)}>Keep playing</Button></div>}
 <ol className="stage-steps">{status.map((label,i)=><li key={label} aria-current={step===i?'step':undefined}>{i<step?<Check size={14}/>:i+1} {label}</li>)}</ol>
 {error&&<div role="alert" className="warning">{error}<Button onClick={()=>perform(async()=>{})}>Refresh</Button></div>}
 {!seller?<p>Loading wallets…</p>:sale?<><section className="panel stage-receipt"><div className="section-title"><h2><Check/> Sale settled</h2><span className="badge green-badge">{seller.totals.sales} receipt</span></div>
 <div className="stage-relic"><Gem/><div><h2>{sale.name}</h2><p>Current owner · {sale.buyer} · #{sale.item.slice(-8)}</p></div></div>
 <div className="stage-accounts">{roles.map(role=>{
  const change=role==='Seller'?sale.price*.99:role===sale.buyer?-sale.price:0
  return <div key={role}><small>{role}</small><strong>{cash(room[role].balance-change)} → {cash(room[role].balance)}</strong><span>{role==='Seller'?'Delivered relic':role===sale.buyer?'Received relic':'Listing closed · balance preserved'}</span></div>
 })}</div>
 <Split price={sale.price}/><div className="stage-accounts"><div><small>RoFun treasury</small><strong>{cash(seller.totals.platform-sale.price/200)} → {cash(seller.totals.platform)}</strong></div><div><small>Burned to date</small><strong>{cash(seller.totals.burned-sale.price/200)} → {cash(seller.totals.burned)}</strong></div><div><small>Remaining room supply</small><strong>{cash(6_000_000-seller.totals.burned+sale.price/200)} → {cash(6_000_000-seller.totals.burned)}</strong></div></div>
 <p>{sale.item.startsWith('sample-')?'Sample relic used for this rehearsal.':'This relic was earned by recovering three pairs in the vault.'} Rehearsal trades stay outside graduation metrics.</p><p>Network gas · 0 BNB (simulated sale)</p><small>Receipt {sale.id}</small>
 <div className="hero-actions"><Button variant="primary" onClick={()=>location.hash=['Portfolio','stage-'+sale.buyer,sale.item].map(encodeURIComponent).join('/')}>View item in Portfolio</Button><Button onClick={()=>location.hash='Demo'}>Explore Proof of Play</Button></div></section>
 <TestnetProof key={sale.id} receipt={sale.id}/></>:<section className="panel"><div className="section-title"><h2>{status[step]}</h2><span className="badge yellow">{step===1||step===3?'Buyer A + Buyer B':'Seller'}</span></div>
 {!lot?<><p>Find three matching pairs in seven turns to earn a tradable relic. For a short rehearsal, use the sample relic.</p>
 {run&&<VaultBoard run={run} busy={busy} flip={tile=>perform(()=>call('Seller',{action:'flip',id:run.id,revision:run.revision,tile}))}/>}
 {item&&<div className="success"><Gem/> Recovered {item.name}</div>}
 <div className="hero-actions">{!item&&run?.outcome!=='Playing'&&<Button disabled={busy} onClick={()=>perform(()=>call('Seller',{action:'start'}))}>{run?'Play again':'Play the vault'}</Button>}
 <Button variant="primary" disabled={busy} onClick={()=>perform(prepare)}>{item?'List recovered relic for 1 RELIC':'Use sample listing · 1 RELIC'}</Button></div></>:<>
 <div className="stage-relic"><Gem/><div><h2>{lot.name}</h2><p><Lock size={13}/> Listed · held by Seller · #{lot.item.slice(-8)}</p></div></div>
 {seller.expiredOffers?.length>0&&!requested&&<p role="status">Request expired. The relic is still listed. Request again to continue.</p>}
 <Split price={lot.price}/><div className="stage-accounts">{buyers.map((role,i)=><div key={role}><small>{role}</small><strong>{cash(room[role].balance)}</strong><span>{offers[i]?.offerStatus??'Ready to request'}</span></div>)}</div>
 {step===1&&<Button variant="primary" disabled={busy} onClick={()=>perform(async()=>{await Promise.all(buyers.map((role,i)=>offers[i]?Promise.resolve():call(role,{action:'offer',id:lot.id,price:lot.price})))})}>Request as both buyers</Button>}
 {step===2&&<Button variant="primary" disabled={busy} onClick={()=>perform(async()=>{for(const offer of offers)if(offer?.offerStatus==='requested')await call('Seller',{action:'approve',id:offer.offerId})})}>Approve as seller</Button>}
 {step===3&&<><p>Check the relic, its price and the 1% fee. Both buyers will confirm the same listing.</p><Button variant="primary" disabled={busy||wait>0} onClick={()=>perform(settle)}>{wait>0?'Review for '+wait+'s':'Confirm both purchases'}</Button></>}
 </>}</section>}
 </div>
}
