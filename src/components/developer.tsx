import {useState} from 'react'
import {ArrowLeft,ArrowRight,Check,Rocket,Trophy} from 'lucide-react'
import type {Game,Metrics,State} from '../lib/model'
import {genres,money,num} from '../lib/data'
import {defaults,graduation,rules} from '../lib/graduation'
import {DeveloperMode} from './revenue'
import {bnb,claimReward,launchFee,launchGame,rewardBudget} from '../lib/economy'
import {rewards} from '../lib/rewards'
import {Button} from './ui/button'
import {Graduation,type Update} from './details'
export function Developer({state,update,launch}:{state:State;update:Update;launch:()=>void}){
 const [id,setId]=useState('arena')
 const g=state.games.find(g=>g.id===id)??state.games[0]
 const milestones=rewards(g)
 return <><div className="heading"><div><h1>Developer Hub</h1><p>Track player adoption, token performance, and milestone rewards.</p></div><Button variant="primary" onClick={launch}><Rocket size={16}/> Launch Game</Button></div><label className="field selector">Game<select value={g.id} onChange={e=>setId(e.target.value)}>{state.games.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><section className="panel metric-grid">{[['Historical players',num(g.metrics.unique)],['Verified active',num(g.metrics.active)],['Day-7 retention',g.metrics.retention+'%'],['Market cap',money(g.cap)],['Token price',g.price.toFixed(8)+' BNB'],['24h change',g.change+'%'],['Graduation',graduation(g).progress+'%'],['Suspicious accounts',num(g.suspicious)],['Claimed reward points',num(milestones.reduce((n,m)=>n+(m.status==='Claimed'?m.points:0),0))]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</section>
 <DeveloperMode game={g} state={state}/><div className="trade-layout"><Graduation g={g} update={update}/><section className="panel"><h2><Trophy size={19}/> Developer milestone rewards</h2><p>Rewards draw from a fixed demo sponsor allocation of {num(rewardBudget)} points. {num(state.rewardPool)} points remain. Points have no BNB redemption value.</p>{milestones.map(m=><div className="list-row" key={m.id}><div><strong>{m.label}</strong><br/><small>{m.points} points · {m.status}</small></div>{m.status==='Unlocked'&&<Button disabled={state.rewardPool<m.points} onClick={()=>update(s=>claimReward(s,g.id,m.id))}>Claim</Button>}{m.status==='Claimed'&&<Check size={17} className="green"/>}</div>)}</section></div></>
}
const steps=['Game information','Token information','Graduation configuration','Review and launch']
const empty={name:'',description:'',genre:'Survival',thumbnail:'',url:'',token:'',ticker:'',supply:'10000000',utility:''}
export function Launch({state,update,open}:{state:State;update:Update;open:(g:Game)=>void}){
 const [step,setStep]=useState(0)
 const [fields,setFields]=useState(empty)
 const [targets,setTargets]=useState<Metrics>({...defaults})
 const [error,setError]=useState('')
 const field=(key:keyof typeof empty,label:string,type='text',required=true)=><label className="field">{label}<input value={fields[key]} required={required} type={type} min={type==='number'?1:undefined} maxLength={key==='ticker'?10:undefined} pattern={key==='ticker'?'[A-Za-z0-9]{2,10}':undefined} onChange={e=>setFields({...fields,[key]:e.target.value})}/></label>
 return <><div className="heading"><div><h1>Launch Game</h1><p>List your Web3 game and configure its Proof of Play targets.</p></div></div><div className="steps">{steps.map((name,i)=><span key={name} className={step===i?'active':i<step?'done':''}>{i<step?<Check size={14}/>:i+1} {name}</span>)}</div><form className="panel launch-form" onSubmit={async e=>{
  e.preventDefault();setError('')
  if(step===0&&[fields.url,fields.thumbnail].some(url=>url&&!/^https?:\/\//i.test(url))){setError('Use an HTTP or HTTPS URL.');return}
  if(step<3){setStep(step+1);return}
  if(state.bnb<launchFee){setError('Insufficient virtual BNB for the launch fee.');return}
  if(state.games.some(g=>g.ticker.toLowerCase()===fields.ticker.toLowerCase())){setError('This ticker is already listed. Choose another ticker.');return}
  const price=.000001
  const g:Game={id:crypto.randomUUID(),name:fields.name.trim(),ticker:fields.ticker.toUpperCase(),description:fields.description,genre:fields.genre,art:4,thumbnail:fields.thumbnail,url:fields.url,developer:'Demo Studio',metrics:{active:0,unique:0,minutes:0,retention:0,liquidity:0},targets,suspicious:0,cap:price*600*Number(fields.supply),volume:0,change:0,price,history:[price,price],supply:Number(fields.supply),tokenName:fields.token,utility:fields.utility,returning:0,sessions:[],claimed:[]}
  const next=await update(s=>launchGame(s,g))
  if(next.games.some(item=>item.id===g.id))open(g)
  else setError('Launch could not complete. Check the available balance and ticker.')
 }}><h2>{steps[step]}</h2>
 {step===0&&<>{field('name','Game name')}<label className="field">Description<textarea required value={fields.description} onChange={e=>setFields({...fields,description:e.target.value})}/></label><label className="field">Genre<select value={fields.genre} onChange={e=>setFields({...fields,genre:e.target.value})}>{genres.slice(1).map(v=><option key={v}>{v}</option>)}</select></label>{field('thumbnail','Thumbnail URL (optional)','url',false)}{field('url','Game URL (optional)','url',false)}</>}
 {step===1&&<>{field('token','Token name')}{field('ticker','Ticker')}{field('supply','Token supply','number')}<label className="field">Token utility<textarea required value={fields.utility} onChange={e=>setFields({...fields,utility:e.target.value})}/></label></>}
 {step===2&&rules.map(([k,label,unit])=><label className="field" key={k}>{label}{unit?' ('+unit.trim()+')':''}<input type="number" required min={k==='liquidity'||k==='minutes'?.1:1} max={k==='retention'?100:undefined} step={k==='liquidity'||k==='minutes'?.1:1} value={targets[k]||''} onChange={e=>setTargets({...targets,[k]:Number(e.target.value)})}/></label>)}
 {step===3&&<><h3>{fields.name} · ${fields.ticker.toUpperCase()}</h3><p>{fields.description}</p><p>{fields.genre} · {fields.url}</p><p>{fields.token} · {num(Number(fields.supply))} tokens · {fields.utility}</p>{rules.map(([k,label,unit])=><div className="list-row" key={k}>{label}<strong>{targets[k]}{unit}</strong></div>)}<div className="list-row"><span>One-time token launch fee to RoFun</span><strong>{bnb(launchFee)}</strong></div><p>In-game currency: {fields.ticker.toUpperCase()} · BNB Smart Chain (56) · Gas: BNB · Simulated settlement</p><p>Wallet {bnb(state.bnb)} · Pre-Migration. All balances, trades, and milestones are simulated.</p></>}
 {error&&<p className="warning">{error}</p>}<div className="form-actions">{step>0&&<Button type="button" onClick={()=>setStep(step-1)}><ArrowLeft size={15}/> Back</Button>}<Button variant="primary" type="submit">{step===3?'Launch simulated game':'Continue'} <ArrowRight size={15}/></Button></div></form></>
}
