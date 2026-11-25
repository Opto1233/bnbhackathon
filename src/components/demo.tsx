import {useState} from 'react'
import {Activity,Bot,Droplets,FlaskConical,RotateCcw,TrendingDown,UserPlus,Users,Zap} from 'lucide-react'
import type {Game,State} from '../lib/model'
import {initial,money,num} from '../lib/data'
import {graduation} from '../lib/graduation'
import {botAttack,verification} from '../lib/verification'
import {Button} from './ui/button'
import {FeePanel,Graduation,updateGame,type Update} from './details'
import type {OpenGame} from './catalog'
export function Demo({state,update,open,notify,startGuide}:{startGuide:()=>void;state:State;update:Update;open:OpenGame;notify:(s:string)=>void}){
 const [id,setId]=useState('hype')
 const g=state.games.find(g=>g.id===id)??state.games[0]
 const [reset,setReset]=useState(false)
 const [tiersError,setTiersError]=useState('')
 const [attack,setAttack]=useState<{game:string;raw:number;active:number;eligible:boolean;afterRaw:number}|null>(null)
 const actions=[
  {label:'Simulate new verified players',icon:UserPlus,fn:(g:Game)=>({...g,metrics:{...g.metrics,active:g.metrics.active+125,unique:g.metrics.unique+125,minutes:Math.max(15,g.metrics.minutes)}})},
  {label:'Simulate returning players',icon:Users,fn:(g:Game)=>{const returning=Math.min(80,Math.max(0,g.metrics.unique-g.metrics.active));return {...g,returning:g.returning+returning,metrics:{...g.metrics,active:g.metrics.active+returning,retention:g.metrics.unique?Math.min(100,g.metrics.retention+8):0}}}},
  {label:'Increase liquidity',icon:Droplets,fn:(g:Game)=>({...g,metrics:{...g.metrics,liquidity:g.metrics.liquidity+5}})},
  {label:'Simulate Bot Attack',icon:Bot,fn:botAttack},
  {label:'Simulate declining player retention',icon:TrendingDown,fn:(g:Game)=>({...g,metrics:{...g.metrics,retention:Math.max(0,g.metrics.retention-15)}})},
  {label:'Complete graduation requirements',icon:Zap,fn:(g:Game)=>({...g,ready:true,metrics:{active:Math.max(g.metrics.active,g.targets.active),unique:Math.max(g.metrics.unique,g.targets.unique,g.metrics.active,g.targets.active),minutes:Math.max(g.metrics.minutes,g.targets.minutes),retention:Math.max(g.metrics.retention,g.targets.retention),liquidity:Math.max(g.metrics.liquidity,g.targets.liquidity)}})},
 ]
 return <><div className="heading"><div><h1>Hackathon Demo</h1><p>Compare market hype with verified adoption and test each graduation requirement.</p></div><Button onClick={()=>setReset(!reset)}><RotateCcw size={16}/> Reset demonstration</Button></div>
 {reset&&<div className="warning">Reset listings, wallet, trades, sessions, and rewards to the sample state? <Button onClick={()=>{update(()=>initial());setReset(false);setAttack(null);setId('hype');notify('Demonstration reset')}}>Confirm reset</Button></div>}
 <section className="panel"><h2>Relic Vale trade demo</h2><p>Recover a relic and watch two buyers compete for it.</p><Button variant="primary" onClick={()=>location.hash="Trade%20Demo"}>Start trade demo</Button></section><section className="panel"><h2>Proof of Play walkthrough</h2><p>Play a verified round, buy a cosmetic, follow its revenue, and graduate a game token.</p><Button variant="primary" onClick={startGuide}>Start guided demo</Button></section>
 <div className="comparison">{['hype','organic'].map((game,i)=>{const item=state.games.find(g=>g.id===game)!;const stage=graduation(item);return <button className={'panel comparison-card '+(id===game?'selected':'')} key={game} onClick={()=>setId(game)}><span className="feature"><span/> {i===0?'GAME A · HYPE':'GAME B · ORGANIC'}</span><h2>{item.name}</h2><div className="metric-grid"><div><small>Market cap</small><strong>{money(item.cap)}</strong></div><div><small>24h volume</small><strong>{money(item.volume)}</strong></div><div><small>Verified active</small><strong>{num(item.metrics.active)}</strong></div><div><small>D7 retention</small><strong>{item.metrics.retention}%</strong></div><div><small>Liquidity reserve</small><strong>{num(item.metrics.liquidity)} BNB</strong></div></div><span className={'badge '+(stage.eligible||item.migrated?'green-badge':'gray')}>{item.migrated?'Migrated':stage.eligible?'Migration unlocked':'Migration locked'}</span></button>})}</div>
 <div className="trade-layout"><section className="panel"><div className="section-title"><h2><FlaskConical size={20}/> Simulation controls</h2><button className="text-btn" onClick={()=>open(g)}>View game ↗</button></div><label className="field">Target game<select value={g.id} onChange={e=>setId(e.target.value)}>{state.games.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="demo-actions">{actions.map(({label,icon:Icon,fn})=><Button key={label} onClick={()=>{if(label==='Simulate Bot Attack'){
 const next=fn(g);setAttack({game:g.id,raw:verification(g).raw,active:g.metrics.active,eligible:graduation(g).eligible,afterRaw:verification(next).raw})
 }update(s=>updateGame(s,g.id,fn));notify(label==='Simulate Bot Attack'?'500 suspicious accounts detected. Verified activity unchanged.':label+' applied.')}}><Icon size={16}/> {label}</Button>)}</div> {attack?.game===g.id&&<section aria-live="polite"><h3>Last simulated attack</h3><p>Raw accounts {num(attack.raw)} → {num(attack.afterRaw)} · Qualified players {num(attack.active)} → {num(attack.active)} · Eligibility stayed {attack.eligible?'unlocked':'closed'}.</p></section>}<div className="metric-grid"><div><small>Raw active accounts</small><strong>{num(verification(g).raw)}</strong></div><div><small>Verified active</small><strong>{num(g.metrics.active)}</strong></div><div><small>Suspicious</small><strong className={g.suspicious?'red':''}>{num(g.suspicious)}</strong></div></div></section><Graduation g={g} update={update}/></div><FeePanel g={g} state={state}/>
 <form key={state.tiers.map(t=>[t.min,t.rate]).join('|')} className="panel" onSubmit={e=>{
  e.preventDefault();const form=new FormData(e.currentTarget)
  const tiers=state.tiers.map((_,i)=>({min:Number(form.get('min'+i)),rate:Number(form.get('rate'+i))}))
  if(tiers.some((tier,i)=>i>0&&(tier.min<=tiers[i-1].min||tier.rate>=tiers[i-1].rate))){setTiersError('Minimum players must increase and fees must decrease at each tier.');return}
  setTiersError('');update(s=>({...s,tiers}));notify('Fee tiers updated')
 }}><h2><Activity size={18}/> Configure fee tiers</h2><div className="tiers">{state.tiers.map((tier,i)=><div key={i}><label className="field">Minimum verified players<input type="number" name={'min'+i} defaultValue={tier.min} min="0" readOnly={i===0} required/></label><label className="field">Fee (%)<input type="number" name={'rate'+i} defaultValue={tier.rate} min="0" max="10" step=".01" required/></label></div>)}</div>{tiersError&&<p className="warning">{tiersError}</p>}<Button type="submit">Save fee tiers</Button></form></>
}
