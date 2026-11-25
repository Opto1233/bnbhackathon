import {useEffect,useRef,useState} from 'react'
import {ShoppingBag} from 'lucide-react'
import {bnb,cosmetics,equip,purchase} from '../lib/economy'
import {drawAvatar} from '../lib/arena-art'
import type {State,Receipt} from '../lib/model'
import type {Update} from './details'
import {Button} from './ui/button'
export function ReceiptView({entry}:{entry:Receipt}){
 const amount=(n:number)=>entry.currency?n+" "+entry.currency:bnb(n)
 return <div className="receipt"><strong>{entry.label}</strong><div className="list-row"><span>Transaction amount</span><strong>{amount(entry.gross)}</strong></div><div className="list-row"><span>{entry.currency?'Seller · 99%':entry.kind==='Cosmetic'?'Developer · 95%':'Developer share'}</span><strong>{amount(entry.developer)}</strong></div><div className="list-row"><span>{entry.currency?'RoFun treasury · 0.5%':entry.kind==='Cosmetic'?'RoFun treasury · 5%':'RoFun treasury fee'}</span><strong>{amount(entry.platform)}</strong></div>{entry.currency&&<div className="list-row"><span>Burned · 0.5%</span><strong>{amount(entry.burned??0)}</strong></div>}<small>{new Date(entry.at).toLocaleString()} · {entry.id}</small></div>
}
function Preview({id}:{id:string}){
 const ref=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{
  const ctx=ref.current?.getContext('2d')
  if(!ctx)return
  ctx.clearRect(0,0,190,115)
  if(id==='diamond'||id==='founder'){
   for(let i=0;i<5;i++){ctx.save();ctx.translate(19+i*10,74-i*3);ctx.rotate(Math.PI/4);ctx.fillStyle='#74f7ff';ctx.fillRect(-i,-i,i+2,i+2);ctx.restore()}
  }
  drawAvatar(ctx,98,57,id==='diamond'?'default':id,2.45,-Math.PI/6)
 },[id])
 return <canvas ref={ref} width="190" height="115" aria-label="Selected cosmetic preview"/>
}
export function Store({state,update}:{state:State;update:Update}){
 const [selected,setSelected]=useState('gold')
 const item=cosmetics.find(i=>i.id===selected)
 const owned=!item||state.owned.includes(selected)
 const equipped=selected==='diamond'?state.diamond:state.skin===selected
 const last=state.receipts.find(t=>t.kind==='Cosmetic')
 return <section className="panel" id="cosmetic-store"><div className="section-title"><h2><ShoppingBag size={19}/> Arena cosmetic store</h2><span className="badge gray">Virtual funds</span></div><p>Your wallet holds <strong>{state.tokens.arena??0} ARENA</strong>. A 1% fee splits equally between RoFun and a token burn. Buy ARENA in the Trading tab. Skins and trails change appearance only. Gold coins count toward your arcade score.</p>
 <div className="store-grid"><div className="store-items">{[{id:'default',name:'Circuit Pilot',price:0},...cosmetics].map(i=><button key={i.id} aria-pressed={selected===i.id} onClick={()=>setSelected(i.id)}><span>{i.name}</span><small>{i.id==='default'||state.owned.includes(i.id)?'Owned':i.price+" ARENA"}</small></button>)}</div>
 <div className="preview-item"><Preview id={selected}/><h3>{item?.name??'Circuit Pilot'}</h3><p>{item?.description??'Your starting pilot.'}</p>{owned?<Button variant="primary" disabled={equipped&&selected!=='diamond'} onClick={()=>update(s=>equip(s,selected))}>{equipped?(selected==='diamond'?'Remove trail':'Equipped'):'Equip cosmetic'}</Button>:<Button variant="primary" disabled={(state.tokens.arena??0)<item!.price} onClick={()=>update(s=>purchase(s,selected))}>{(state.tokens.arena??0)<item!.price?'Insufficient ARENA':'Buy for '+item!.price+' ARENA'}</Button>}</div></div>
 {last&&<details key={last.id} open><summary>Latest cosmetic receipt</summary><ReceiptView entry={last}/></details>}</section>
}
