import {useState} from 'react'
import {ChartNoAxesCombined,Wallet} from 'lucide-react'
import {bnb,sum,launchFee} from '../lib/economy'
import {localStats} from '../lib/sessions'
import {qualifies} from '../lib/verification'
import type {Game,Receipt,State} from '../lib/model'
import {Chart} from './charts'
import {ReceiptView} from './store'
const periods={Daily:1,Weekly:7,Monthly:30}
const streams=[['Trade','Trading fees','#f9c649'],['Cosmetic','In-game purchases','#54dca6'],['Launch','Token launches','#b79af7']] as const
export function MetricsGrid({items}:{items:[string,string|number][]}){
 return <div className="metric-grid">{items.map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
}
function Transactions({items}:{items:Receipt[]}){
 return items.length?<div className="receipts">{items.map(r=><details key={r.id}><summary>{r.label} <span>{r.currency?r.platform+" "+r.currency:bnb(r.platform)} fee</span></summary><ReceiptView entry={r}/></details>)}</div>:<p>No transactions in this period.</p>
}
export function LocalAnalytics({game}:{game:Game}){
 const local=localStats(game)
 return <section className="panel"><h2>Local gameplay analytics</h2><p>Completed Arena rounds recorded in this browser. A returning session is a qualifying round by a previously qualified player.</p><MetricsGrid items={[['Completed rounds',local.sessions.length],['Verified sessions',local.verified.length],['Historical unique players',local.players],['Returning verified sessions',local.returns],['Local day-7 retention',local.d7],['Mean active playtime',local.sessions.length?Math.round(local.sessions.reduce((n,s)=>n+(s.activeSeconds??0),0)/local.sessions.length)+'s':'—']]}/></section>
}
export function DeveloperMode({game,state}:{game:Game;state:State}){
 const [selected,select]=useState('')
 const sessions=game.sessions.filter(s=>s.events).slice().reverse()
 const session=sessions.find(s=>s.id===selected)??sessions[0]
 const receipts=state.receipts.filter(t=>t.game===game.id)
 const tokens=receipts.filter(t=>t.currency===game.ticker)
 const sales=receipts.filter(t=>t.kind==='Cosmetic'&&!t.currency)
 return <><section className="panel"><h2>{game.developer} earnings</h2><MetricsGrid items={[['Cosmetic sales',sales.length+tokens.length],['Gross game revenue',bnb(sum(sales,'gross'))],['RoFun purchase fees',bnb(sum(sales,'platform'))],['Net developer earnings',bnb(sum(sales,'developer'))]]}/>{tokens.length>0&&<MetricsGrid items={[['Game-coin sales',sum(tokens,'gross')+" "+game.ticker],['Game-coin earnings',sum(tokens,'developer')+" "+game.ticker]]}/>}<h3 className="subhead">Transaction breakdown</h3><Transactions items={receipts}/></section><LocalAnalytics game={game}/>
 <section className="panel" id="event-log"><h2>Developer Mode · Gameplay event log</h2><p>Activity recorded on this device. Prototype verification measures gameplay and does not establish human identity.</p>{session?<><label className="field">Local run<select value={session.id} onChange={e=>select(e.target.value)}>{sessions.map(s=><option key={s.id} value={s.id}>{new Date(s.at).toLocaleString()} · {s.outcome}</option>)}</select></label><p>Player {session.account} · {qualifies(session)?'Verified':'Unverified'} · {session.activeSeconds}s active · {session.actions} movements · {session.coins} coins · {session.encounters} encounters · score {session.score}</p><div className="event-list">{session.events!.map((e,i)=><div className="list-row" key={i}><time>{e.time.toFixed(1)}s</time><strong>{e.kind}</strong><span>{e.detail}</span></div>)}</div></>:<p>Start RoFun Arena to record the first session.</p>}</section></>
}
function Projection(){
 const [values,set]=useState([10000,2500,.8,5,.04,10])
 const [players,volume,fee,paying,spend,launches]=values
 const streams=[volume*fee/100,players*paying/100*spend*.005,launches*launchFee]
 const total=streams.reduce((a,b)=>a+b,0)
 return <section className="panel projection"><div className="section-title"><h2>Revenue projection simulator</h2><span className="badge gray">Hypothetical</span></div><p>Model monthly gross platform revenue in BNB using eligible RoFun trades, the 0.5% platform share in BNB-equivalent terms, and a 0.05 BNB launch fee.</p><div className="projection-inputs">{['Monthly active players','Monthly eligible trading volume (BNB)','Average trading fee (%)','Paying players (%)','Monthly spend per payer (BNB equivalent)','Monthly token launches'].map((label,i)=><label className="field" key={label}>{label}<input type="number" min="0" max={i===2||i===3?100:undefined} step={i===0||i===5?'1':'any'} value={values[i]} onChange={e=>{let n=Math.max(0,Number(e.target.value)||0);if(i===2||i===3)n=Math.min(n,100);if(i===0||i===5)n=Math.floor(n);set(values.map((v,j)=>j===i?n:v))}}/></label>)}</div><MetricsGrid items={[['Trading',bnb(streams[0])],['Game purchases',bnb(streams[1])],['Launches',bnb(streams[2])],['Projected monthly gross',bnb(total)],['Annualized gross',bnb(total*12)]]}/></section>
}
export function Revenue({state}:{state:State}){
 const [period,setPeriod]=useState<keyof typeof periods>('Daily')
 const now=Date.now(),days=periods[period],start=now-days*86400000
 const coins=state.receipts.filter(r=>r.currency==="ARENA"&&r.at>=start&&r.at<=now)
 const items=state.receipts.filter(r=>!r.currency&&r.at>=start&&r.at<=now)
 const totals=streams.map(([kind])=>sum(items.filter(t=>t.kind===kind),'platform'))
 const total=sum(items,'platform')
 const active=new Set(state.games.flatMap(g=>g.sessions.filter(s=>s.at>=start&&qualifies(s)).map(s=>s.account))).size
 const buckets=days===1?24:days
 const width=days*86400000/buckets
 const history=Array.from({length:buckets},(_,i)=>{
  const begin=start+i*width,end=begin+width
  return {time:new Date(end).toLocaleString(undefined,days===1?{hour:'numeric'}:{month:'short',day:'numeric'}),revenue:sum(items.filter(r=>r.at>=begin&&(i===buckets-1?r.at<=now:r.at<end)),'platform')}
 })
 const developers=Array.from(new Set(items.filter(t=>t.developer>0).map(t=>state.games.find(g=>g.id===t.game)!.developer)))
 return <><div className="heading"><div><h1>Platform Revenue</h1><p>RoFun treasury · Recorded virtual BNB transactions in this browser</p></div></div><div className="filters" aria-label="Revenue period">{(Object.keys(periods) as (keyof typeof periods)[]).map(p=><button key={p} aria-pressed={p===period} className={p===period?'selected':''} onClick={()=>setPeriod(p)}>{p}</button>)}</div>
 <section className="panel"><h2>Arena economy</h2><MetricsGrid items={[['Treasury',sum(coins,'platform')+" ARENA"],['Burned',coins.reduce((n,r)=>n+(r.burned??0),0)+" ARENA"],['Seller earnings',sum(coins,'developer')+" ARENA"]]}/><p>A 1 RELIC sale pays 0.99 RELIC to the seller, 0.005 RELIC to RoFun and burns 0.005 RELIC. Each Relic Vale market reports its own sales and cumulative burn.</p></section><div className="treasury-hero"><div><small>Treasury balance · all time</small><h2><Wallet/>{bnb(sum(state.receipts.filter(r=>!r.currency),'platform'))}</h2></div><div><small>{period} platform revenue</small><strong>{bnb(total)}</strong></div></div><section className="panel"><MetricsGrid items={[['Trading fee revenue',bnb(totals[0])],['In-game purchase revenue',bnb(totals[1])],['Token launch revenue',bnb(totals[2])],['Total developer earnings',bnb(sum(items,'developer'))],['Transaction volume',bnb(sum(items,'gross'))],['Paying players',new Set(items.filter(t=>t.kind==='Cosmetic').map(t=>t.account)).size],['Launched games',items.filter(t=>t.kind==='Launch').length],['Revenue per active player',active?bnb(total/active):'—']]}/><p>Period totals use recorded receipts. Revenue per active player uses distinct locally qualified players in the selected period. Volume includes gross trades, cosmetic sales and launch charges.</p></section>
 <div className="trade-layout"><section className="panel"><h2><ChartNoAxesCombined size={19}/> Revenue history</h2><p>Platform fees per {days===1?'hour':'day'} · BNB</p><Chart data={history} lines={[{key:'revenue',label:'Platform fees (BNB)',color:'#f9c649'}]}/></section><section className="panel"><h2>Revenue breakdown</h2>{streams.map(([,label,color],i)=><div className="revenue-bar" key={label}><div className="list-row"><span>{label}</span><strong>{bnb(totals[i])} · {total?(100*totals[i]/total).toFixed(1):0}%</strong></div><div className="track"><i style={{width:(total?100*totals[i]/total:0)+'%',background:color}}/></div></div>)}<p>{total?'Share of recorded platform fees.':'Make a purchase, trade or launch to populate the charts.'}</p></section></div>
 <section className="panel"><h2>Recent revenue transactions</h2><Transactions items={items}/></section><section className="panel"><h2>Developer revenue distribution</h2>{developers.length?developers.map(dev=><div className="list-row" key={dev}>{dev}<strong>{bnb(sum(items.filter(t=>state.games.find(g=>g.id===t.game)?.developer===dev),'developer'))}</strong></div>):<p>Developer earnings appear after a cosmetic sale.</p>}</section><Projection/></>
}
