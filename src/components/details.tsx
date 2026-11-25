import {useState} from 'react'
import {ArrowLeft,ArrowRight,Bookmark,Check,ExternalLink,Info,Lock,Play,ShieldCheck,TriangleAlert} from 'lucide-react'
import type {Game,State} from '../lib/model'
import {image,money,num} from '../lib/data'
import {graduation} from '../lib/graduation'
import {fees} from '../lib/fees'
import {quote,trade} from '../lib/trading'
import {analytics,activity,ranges} from '../lib/analytics'
import {botAttack} from '../lib/verification'
import {LocalAnalytics} from './revenue'
import {bnb} from '../lib/economy'
import {Button} from './ui/button'
import {Chart} from './charts'
import {Relic} from './relic'
import {Arena} from './arena'
export type Update=(update:(state:State)=>State)=>Promise<State>
export function updateGame(s:State,id:string,fn:(g:Game)=>Game):State{return {...s,games:s.games.map(g=>g.id===id?fn(g):g)}}
export function migrate(g:Game):Game{
 if(!graduation(g).eligible)return g
 return {...g,migrated:{id:'SIM-'+crypto.randomUUID(),date:new Date().toISOString()}}
}
export function Graduation({g,update,compact=false}:{g:Game;update:Update;compact?:boolean}){
 const rank=graduation(g)
 return <section className="panel graduation"><div className="section-title"><h2><ShieldCheck size={21}/> Proof of Play</h2><span className={'badge '+(g.migrated?'green-badge':rank.eligible?'yellow':'gray')}>{rank.status}</span></div><p>{rank.passed} of 5 demonstration requirements met · Sample baseline + demo controls{g.id==='arena'?' + qualified browser sessions':''}</p>
 {rank.rows.map(r=><div className="requirement" key={r.key}><div><span>{r.label} <span className="hint" tabIndex={0} data-tip={r.help}><Info size={13}/></span></span><strong>{num(r.value)}{r.unit} / {num(r.target)}{r.unit}</strong><span className={r.pass?'green':'muted'}>{r.pass?<Check size={16}/>:<Lock size={14}/>} {r.pass?'Pass':'Fail'}</span></div><div className={'track '+(r.pass?'passed':'')}><i style={{width:r.progress+'%'}}/></div></div>)}
 {g.suspicious>0&&<div className="warning"><TriangleAlert size={17}/> {num(g.suspicious)} suspicious accounts excluded from graduation.</div>}
 {g.migrated?<div className="success"><Check size={19}/><div><strong>Simulated migration to PancakeSwap complete</strong><small>{g.migrated.id} · {new Date(g.migrated.date).toLocaleString()}</small></div></div>:<div className="migration-actions">{rank.eligible&&!g.ready&&<Button onClick={()=>update(s=>updateGame(s,g.id,current=>graduation(current).eligible?{...current,ready:true}:current))}>Mark ready</Button>}<Button variant="primary" disabled={!rank.eligible} onClick={()=>update(s=>updateGame(s,g.id,migrate))}>{rank.eligible?<ArrowRight size={16}/>:<Lock size={15}/>} Migrate to PancakeSwap</Button></div>}
 {!compact&&<small className="muted">A qualifying Arena run updates active players, lifetime players and average playtime. Migration here is simulated. The proposed OpenFour Migrate module would check verified eligibility before executing migration. <a target="_blank" rel="noreferrer" href="https://github.com/four-meme-community/openfour-docs/blob/main/docs/developer-guide.md">OpenFour developer guide ↗</a></small>}</section>
}
export function PlayerAnalytics({g,update}:{g:Game;update:Update}){
 const [range,setRange]=useState('24 hours')
 return <><LocalAnalytics game={g}/><section className="panel"><div className="section-title"><h2>Platform player activity</h2><span className="badge gray">Simulated history</span></div><div className="filters chart-filters">{ranges.map(r=><button className={r===range?'selected':''} onClick={()=>setRange(r)} key={r}>{r}</button>)}</div><Chart data={activity(g,range)} lines={[{key:'verified',label:'Rolling verified active',color:'#f7c948'},{key:'concurrent',label:'Concurrent online',color:'#55dcb0'}]}/><p>Concurrent players are online at the same time. Verified active players are distinct qualifying accounts over 24 hours. Historical uniques count verified accounts once across all time.</p><div className="metric-grid">{analytics(g).map(([k,v])=><div key={k}><small>{k}</small><strong>{typeof v==='number'?num(v):v}</strong></div>)}</div></section>
 <section className="panel"><div className="section-title"><h2>Anti-Sybil verification</h2><Button onClick={()=>update(s=>updateGame(s,g.id,botAttack))}>Simulate Bot Attack</Button></div><p>Simulated gameplay verification uses unique account IDs, meaningful actions, and session duration. Duplicate sessions are rejected. Repeated activity patterns and suspicious account clusters are modeled by the demo attack.</p>{g.suspicious>0&&<div className="warning"><TriangleAlert size={17}/> {num(g.suspicious)} suspicious accounts detected and excluded.</div>}<p>Prototype verification does not establish human identity.</p><h3>Recorded sessions</h3>{g.sessions.length?g.sessions.slice(-5).reverse().map(s=><div className="list-row" key={s.id}>{new Date(s.at).toLocaleTimeString()} <span>{s.seconds}s · {s.coins} coins · {s.actions} actions</span></div>):<p>No locally recorded sessions yet.</p>}</section></>
}
export function FeePanel({g,state}:{g:Game;state:State}){
 const {current,next,saving}=fees(g.metrics.active,state.tiers)
 return <section className="panel"><h2>Dynamic trading fees</h2><p>Based on {num(g.metrics.active)} verified active accounts in the rolling 24-hour window.</p><div className="metric-grid"><div><small>Current fee</small><strong>{current.rate.toFixed(2)}%</strong></div><div><small>Next fee</small><strong>{next?next.rate.toFixed(2)+'%':'Lowest tier'}</strong></div><div><small>Verified players to next tier</small><strong>{next?num(next.min-g.metrics.active):'—'}</strong></div><div><small>Savings per 1 BNB vs. base rate</small><strong>{(saving/100).toFixed(4)} BNB</strong></div></div></section>
}
function Price({g}:{g:Game}){
 const [period,setPeriod]=useState('24H')
 const count=period==='1H'?12:period==='24H'?30:50
 return <section className="panel"><div className="section-title"><h2>${g.ticker} price</h2><div className="filters chart-filters">{['1H','24H','7D'].map(r=><button className={r===period?'selected':''} key={r} onClick={()=>setPeriod(r)}>{r}</button>)}</div></div><Chart price data={g.history.slice(-count).map((price,i,rows)=>({time:i===rows.length-1?'Now':`−${Math.ceil((rows.length-1-i)*(period==='1H'?60:period==='24H'?1440:10080)/(rows.length-1))}m`,price}))} lines={[{key:'price',label:'Token price',color:'#f7c948'}]}/></section>
}
function Transactions({g,state}:{g:Game;state:State}){
 const items=state.trades.filter(t=>t.game===g.id).slice(0,10)
 return <section className="panel"><h2>Recent paper trades</h2><p>Fees apply to trades routed through RoFun. External PancakeSwap activity is outside this ledger.</p>{items.length?items.map(t=><div className="list-row" key={t.id}><strong className={t.side==='Buy'?'green':'red'}>{t.side}</strong><span>{t.side==='Buy'?`${num(t.amount)} BNB → ${num(t.output)} ${g.ticker}`:`${num(t.amount)} ${g.ticker} → ${t.output.toFixed(5)} BNB`}</span><small>{state.receipts.some(r=>r.id===t.id)?bnb(t.fee)+' to treasury · ':''}{new Date(t.at).toLocaleTimeString()}</small></div>):<p>No paper trades yet.</p>}</section>
}
function Trading({g,state,update,notify}:{g:Game;state:State;update:Update;notify:(s:string)=>void}){
 const [side,setSide]=useState<'Buy'|'Sell'>('Buy')
 const [amount,setAmount]=useState('')
 const [confirm,setConfirm]=useState(false)
 const q=quote(g,side,Number(amount),state)
 const tokenBalance=state.tokens[g.id]??0
 return <><div className="trade-layout"><Price g={g}/><section className="panel"><div className="section-title"><h2>Paper trading</h2><span className="badge yellow">Virtual funds</span></div><div className="segmented">{(['Buy','Sell'] as const).map(s=><button className={side===s?'active':''} key={s} onClick={()=>{setSide(s);setAmount('');setConfirm(false)}}>{s}</button>)}</div><p>{state.bnb.toFixed(4)} BNB · {num(tokenBalance)} {g.ticker}</p><label className="field">Amount ({side==='Buy'?'BNB':g.ticker})<input type="number" min="0" step="any" value={amount} onChange={e=>{setAmount(e.target.value);setConfirm(false)}}/></label><div className="filters chart-filters">{(side==='Buy'?[.1,.5,1,5]:[.25,.5,.75,1]).map(a=><button key={a} onClick={()=>{setAmount(String(side==='Buy'?a:a*tokenBalance));setConfirm(false)}}>{side==='Buy'?a+' BNB':a*100+'%'}</button>)}</div>
 <div className="list-row"><span>Estimated output</span><strong>{Number(amount)>0?q.output.toFixed(side==='Buy'?2:6):'0'} {side==='Buy'?g.ticker:'BNB'}</strong></div><div className="list-row"><span>RoFun treasury fee · {q.percent.toFixed(2)}%</span><strong>{q.valid?bnb(q.fee):'0 BNB'}</strong></div><div className="list-row"><span>Price impact</span><strong>{q.valid?q.impact.toFixed(2):'0'}%</strong></div><div className="list-row"><span>Virtual pool reserve</span><strong>{num(g.metrics.liquidity)} BNB</strong></div>
 {confirm&&q.valid&&<p className="warning">RoFun route · {side} {g.ticker} using virtual funds.</p>}<Button className="full" variant="primary" disabled={!q.valid} onClick={async()=>{if(!confirm){setConfirm(true);return}
 const id=crypto.randomUUID()
 const result=await update(s=>trade(s,g.id,side,Number(amount),id,q))
 setConfirm(false)
 if(result.receipts.some(r=>r.id===id)){setAmount('');notify('Paper trade completed')}else notify('The quote or balance changed. Preview the updated trade.')
 }}>{confirm?'Confirm paper trade':`Preview ${side.toLowerCase()}`}</Button></section></div><FeePanel g={g} state={state}/><Transactions g={g} state={state}/></>
}
const tabs=['Overview','Trading','Player Analytics','Tokenomics','Developer Roadmap']
export function Details({g,state,tab,setTab,back,update,toggle,notify}:{g:Game;state:State;tab:string;setTab:(s:string)=>void;back:()=>void;update:Update;toggle:()=>void;notify:(s:string)=>void}){
 return <><button className="back" onClick={back}><ArrowLeft size={16}/> Back to games</button><section className="hero detail-hero" style={{backgroundImage:`linear-gradient(90deg,#141216ee 8%,#14121699 38%,#14121615 100%),url("${image(g)}")`}}><div className="hero-content"><div className="feature"><span/> {g.genre.toUpperCase()}</div><h1>{g.name}</h1><div className="hero-tags"><span className="badge yellow">${g.ticker}</span><span className="badge gray">{graduation(g).status}</span></div><p>{g.description}</p><div className="hero-actions"><Button variant="primary" onClick={()=>setTab('Play')}><Play size={15}/> Play Now</Button><Button onClick={toggle}><Bookmark size={16} fill={state.watch.includes(g.id)?'currentColor':'none'}/> {state.watch.includes(g.id)?'Saved':'Watch'}</Button></div></div></section>
 <section className="panel metric-grid market-summary">{[['Token price',g.price.toFixed(8)+' BNB'],['Market cap',money(g.cap)],['Liquidity',num(g.metrics.liquidity)+' BNB'],['24h volume',money(g.volume)],['Holders',num(Math.round(g.metrics.unique*.62))]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</section>
 <div className="tabs">{[...tabs,...(tab==='Play'?['Play']:[])].map(t=><button className={t===tab?'active':''} key={t} onClick={()=>setTab(t)}>{t}</button>)}</div>
 {tab==='Overview'&&<><div className="trade-layout"><Price g={g}/><Graduation g={g} update={update}/></div><PlayerAnalytics g={g} update={update}/><section className="panel"><h2>About {g.name}</h2><p>{g.description}</p><p>Developed by <strong>{g.developer}</strong></p><h3>Sample reviews</h3><div className="list-row"><strong>PixelRider</strong><span>“The progression feels rewarding.”</span></div><div className="list-row"><strong>OrbitScout</strong><span>“Great to see player activity beside the token data.”</span></div></section><Transactions g={g} state={state}/></>}
 {tab==='Trading'&&<Trading g={g} state={state} update={update} notify={notify}/>}
 {tab==='Player Analytics'&&<PlayerAnalytics g={g} update={update}/>}
 {tab==='Tokenomics'&&<><section className="panel"><h2>{g.tokenName??g.name+" Token"} · ${g.ticker}</h2><p>In-game currency: {g.ticker} · BNB Smart Chain · Network gas: BNB (simulated)</p><p>Supply: {num(g.supply)} · {g.utility}</p></section><FeePanel g={g} state={state}/><Graduation g={g} update={update}/></>}
 {tab==='Developer Roadmap'&&<section className="panel"><h2>{g.developer}</h2>{['Launch the playable game','Grow and verify the player community','Meet Proof of Play requirements','Open simulated PancakeSwap liquidity'].map((s,i)=><div className="list-row" key={s}><strong>{i+1}. {s}</strong><span className="badge gray">{i===0||i===3&&g.migrated?'Complete':'Planned'}</span></div>)}</section>}
 {tab==='Play'&&(g.id==='relic'?<Relic/>:g.id==='arena'?<Arena state={state} update={update}/>:<section className="panel"><h2>Play {g.name}</h2>{g.url?<Button asChild variant="primary"><a href={g.url} target="_blank" rel="noreferrer">Open game <ExternalLink size={15}/></a></Button>:<p>This fictional listing has no playable link. Open RoFun Arena from Discover to try the browser game.</p>}</section>)}</>
}
