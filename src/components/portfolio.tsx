import {useEffect,useState} from 'react'
import type {State} from '../lib/model'
import {bnb,cosmetics} from '../lib/economy'
import {requestRelic,type Snapshot} from './relic'
import {Coins,Gem,Wallet} from 'lucide-react'
import {PortfolioHistory} from './portfolio-history'
import './portfolio.css'
import {Button} from './ui/button'
const amount=(n:number)=>n.toLocaleString('en',{maximumFractionDigits:6})
const value=(n:number)=>n===0?'0 BNB':n<.00000001?'< 0.00000001 BNB':bnb(n)

export function Portfolio({state,focusRole,focusItem}:{state:State;focusRole?:string;focusItem?:string}){
 const [tab,setTab]=useState(focusRole?'In-game items':'Coins')
 const [unit,setUnit]=useState('Game currency')
 const [scope,setScope]=useState(focusRole?.startsWith('stage-')?'Stage demo':focusRole?.startsWith('mentor-')?'Mentor demo':'Shared player market')
 const [role,setRole]=useState(focusRole?.split('-')[1]||'Seller')
 const [market,setMarket]=useState<Snapshot|null>(null)
 const [status,setStatus]=useState('')
 const [revision,refresh]=useState(0)
 useEffect(()=>{
  let current=true
  setMarket(null)
  setStatus('Loading Relic Vale holdings…')
  requestRelic(scope==='Stage demo'?'stage':scope==='Mentor demo'?'mentor':'shared',role).then(result=>{
   if(current){setMarket(result);setStatus('')}
  }).catch(()=>{
   if(current)setStatus('Relic Vale holdings unavailable. Try refreshing.')
  })
  return ()=>{current=false}
 },[scope,role,revision])
 const arena=state.games.find(g=>g.id==='arena')
 const relic=state.games.find(g=>g.id==='relic')
 const holdings=state.games.flatMap(game=>{
  const balance=state.tokens[game.id]??0
  return balance>0?[{name:game.name,ticker:game.ticker,balance,price:game.price,source:'RoFun wallet'}]:[]
 })
 if(relic&&market&&market.balance>0)holdings.push({name:relic.name,ticker:relic.ticker,balance:market.balance/1e6,price:relic.price,source:scope!=='Shared player market'?role+' market wallet':'Shared market wallet'})
 const items=[
  ...cosmetics.filter(item=>state.owned.includes(item.id)).map(item=>({id:'arena-'+item.id,name:item.name,game:arena,price:item.price,basis:'Shop price'})),
  ...(market?.items??[]).map(item=>({id:item.id,name:item.name,game:relic,price:item.price!=null?item.price/1e6:item.lastPrice!=null?item.lastPrice/1e6:null,basis:item.price!=null?'Listed · asking price':item.lastPrice!=null?'Last sale':'Unpriced'}))
 ]
 function display(coins:number,ticker:string,price:number){
  return unit==='BNB'&&price>0?value(coins*price):amount(coins)+' '+ticker
 }
 const coinsTotal=state.bnb+holdings.reduce((total,h)=>total+h.balance*h.price,0)
 const itemsTotal=items.reduce((total,item)=>total+(item.price??0)*(item.game?.price??0),0)
 const byTicker=new Map<string,typeof holdings[number]>()
 for(const holding of [{name:'BNB',ticker:'BNB',balance:state.bnb,price:1,source:'RoFun wallet'},...holdings]){
  if(holding.balance<=0)continue
  const prior=byTicker.get(holding.ticker)
  byTicker.set(holding.ticker,{...holding,balance:(prior?.balance??0)+holding.balance})
 }
 const tickerGroups=[...byTicker.values()]
 const historyScope=state.player+':'+scope+':'+(scope!=='Shared player market'?role:'shared')
 return <div className="portfolio-page">
 <div className="heading"><div><h1>Portfolio</h1><p>RoFun wallet + {scope}{scope!=='Shared player market'?' · '+role:''}</p></div><Button onClick={()=>refresh(r=>r+1)}>Refresh holdings</Button></div>
 <section className="panel portfolio-summary" aria-label="Holdings summary">
  <div><span><Wallet size={17}/> Estimated holdings value</span><strong>{value(coinsTotal+itemsTotal)}</strong>{!market&&<small>Relic Vale balance pending</small>}</div>
  <div><span><Coins size={17}/> BNB wallet</span><strong>{value(state.bnb)}</strong><small>Virtual BNB balance</small></div>
  <div><span><Coins size={17}/> Game coins</span><strong>{value(coinsTotal-state.bnb)}</strong><small>{tickerGroups.filter(h=>h.ticker!=='BNB').length} game currencies held</small></div>
  <div><span><Gem size={17}/> In-game items</span><strong>{value(itemsTotal)}</strong><small>{items.length} items · {items.filter(item=>item.price==null).length} unpriced</small></div>
 </section>
 <section className="panel"><div className="section-title"><h2>Holdings</h2><div className="filters" aria-label="Valuation unit">{['Game currency','BNB'].map(text=><button key={text} className={unit===text?'selected':''} aria-pressed={unit===text} onClick={()=>setUnit(text)}>{text}</button>)}</div></div>
 <div className="filters" aria-label="Portfolio section">{['Coins','In-game items'].map(text=><button key={text} className={tab===text?'selected':''} aria-pressed={tab===text} onClick={()=>setTab(text)}>{text}</button>)}</div>
 {tab==='Coins'?<div className="portfolio-assets">{tickerGroups.map(h=><article key={h.ticker} className="portfolio-asset">
  <div className="portfolio-token-icon" data-token={h.ticker} aria-hidden="true">{h.ticker==='BNB'?'◆':h.ticker.slice(0,1)}</div>
  <div className="portfolio-token-name"><strong>{h.ticker}</strong><small>{h.ticker==='BNB'?'BNB Smart Chain':h.name}</small></div>
  <div className="portfolio-token-balance"><strong>{unit==='BNB'?value(h.price*h.balance):amount(h.balance)+' '+h.ticker}</strong>{h.ticker!=='BNB'&&<small>{unit==='BNB'?amount(h.balance)+' '+h.ticker:value(h.price*h.balance)+' estimated'}</small>}</div>
  {h.ticker==='RELIC'&&<small className="portfolio-sources">{'RoFun wallet '+amount(state.tokens.relic??0)+' · '+(scope==='Shared player market'?'Shared':role)+' market wallet '+(market?amount(market.balance/1e6):'…')}</small>}
 </article>)}{tickerGroups.length===0&&<p>No coins held.</p>}</div>:<><h3>Owned items</h3>{items.length===0&&<p>Your inventory is empty.</p>}{items.map(item=><div key={item.id} className={item.id===focusItem?"list-row success":"list-row"}><span><span>{item.name}</span><br/><small>{item.game?.name} · {item.basis}</small></span><strong>{item.price!=null&&item.game?display(item.price,item.game.ticker,item.game.price):'—'}</strong></div>)}</>}
 <p>BNB values use simulated token prices. Item estimates use shop prices, listing prices or the last sale.</p>
 </section>
 <PortfolioHistory key={historyScope} scope={historyScope} total={market?coinsTotal+itemsTotal:null}/>
 <details className="panel portfolio-account"><summary>Relic Vale account · {scope}{scope!=='Shared player market'?' · '+role:''}</summary>
 <label className="field selector">Relic Vale account<select value={scope} onChange={e=>{setMarket(null);setScope(e.target.value)}}><option>Shared player market</option><option>Mentor demo</option><option>Stage demo</option></select></label>
 {scope!=='Shared player market'&&<label className="field selector">Demo trader<select value={role} onChange={e=>{setMarket(null);setRole(e.target.value)}}>{['Seller','Buyer A','Buyer B'].map(name=><option key={name}>{name}</option>)}</select></label>}</details>
 {status&&<p role="status">{status}</p>}
 </div>
}
