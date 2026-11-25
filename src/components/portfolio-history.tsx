import {useEffect,useId,useState} from 'react'
import {Area,AreaChart,CartesianGrid,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts'
import {bnb} from '../lib/economy'

type Point={at:number;value:number}
const day=86_400_000
const windows={'1d':day,'7d':7*day,'30d':30*day,Max:Infinity}
const prefix='rofun.portfolio.history.v1.'
function read(key:string):Point[]{
 try{
  const saved:unknown=JSON.parse(localStorage.getItem(prefix+key)??'[]')
  return Array.isArray(saved)?saved.filter(p=>p&&Number.isFinite(p.at)&&Number.isFinite(p.value)):[]
 }catch{return []}
}
const signed=(n:number)=>(n>0?'+':n<0?'−':'')+bnb(Math.abs(n))

export function PortfolioHistory({scope,total}:{scope:string;total:number|null}){
 const [range,setRange]=useState<keyof typeof windows>('1d')
 const [metric,setMetric]=useState<'value'|'change'>('value')
 const [history,setHistory]=useState(()=>read(scope))
 const gradientId=useId()
 useEffect(()=>{
  const previous=read(scope)
  const last=previous.at(-1)
  if(total===null||last?.value===total){setHistory(previous);return}
  const next=[...previous,{at:Math.max(Date.now(),(last?.at??0)+1),value:total}].slice(-2000)
  try{localStorage.setItem(prefix+scope,JSON.stringify(next))}catch{/* The current chart still works without storage. */}
  setHistory(next)
 },[scope,total])

 const [showExample,chooseExample]=useState(true)
 const example=scope.includes('demo:')&&history.length<2&&total!==null&&showExample
 const end=Date.now()
 const duration=Number.isFinite(windows[range])?windows[range]:30*day
 const series=example?[.97,.975,.96,.99,1.01,.98,.985,1].map((factor,i)=>({at:end-duration*(1-i/7),value:total*factor})):history
 const cutoff=end-windows[range]
 const firstInRange=series.findIndex(point=>point.at>=cutoff)
 const earlier=firstInRange<0?series.at(-1):series[firstInRange-1]
 const points=firstInRange<0?[]:series.slice(firstInRange)
 if(earlier)points.unshift({...earlier,at:cutoff})
 const baseline=points[0]?.value??0
 const latest=points.at(-1)
 const data=latest?[...points,{at:Math.max(Date.now(),latest.at+1),value:latest.value}].map(point=>({
  at:point.at,amount:metric==='change'?point.value-baseline:point.value
 })):[]
 const change=(latest?.value??0)-baseline
 const high=Math.max(0,...data.map(point=>point.amount))
 const low=Math.min(0,...data.map(point=>point.amount))
 const split=high===low?1:high/(high-low)
 const timeFormat=new Intl.DateTimeFormat(undefined,range==='1d'?{hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric'})
 return <section className="panel portfolio-history">
  <div className="section-title"><div><h2>Portfolio history</h2><p>{metric==='change'?'Change in estimated value':'Estimated holdings value'} · BNB</p></div>
  <div className="filters" aria-label="History range">{(Object.keys(windows) as (keyof typeof windows)[]).map(period=><button key={period} aria-pressed={range===period} className={range===period?'selected':''} onClick={()=>setRange(period)}>{period}</button>)}</div></div>
  {scope.includes('demo:')&&history.length<2&&<label><input type="checkbox" checked={showExample} onChange={e=>chooseExample(e.target.checked)}/> Show illustrative history</label>}
  {example&&<p className="badge yellow">Sample chart · illustrative prices</p>}
  <div className="filters" aria-label="History metric"><button aria-pressed={metric==='value'} className={metric==='value'?'selected':''} onClick={()=>setMetric('value')}>Value</button><button aria-pressed={metric==='change'} className={metric==='change'?'selected':''} onClick={()=>setMetric('change')}>Value change</button></div>
  {history.length>0&&<strong className={metric==='change'?(change<0?'red':change>0?'green':''):''}>{metric==='change'?signed(change):bnb(latest?.value??0)}</strong>}
  {series.length>1?<div className="portfolio-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} accessibilityLayer margin={{top:12,right:16,left:0,bottom:8}}>
    <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset={split} stopColor="#4be0b1"/><stop offset={split} stopColor="#f35d91"/></linearGradient></defs>
    <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4"/>
    <XAxis dataKey="at" type="number" domain={['dataMin','dataMax']} tickFormatter={at=>timeFormat.format(at)} minTickGap={30} tick={{fill:'#aeb3bd',fontSize:11}}/>
    <YAxis width={62} domain={metric==='change'?[(min:number)=>Math.min(min,0),(max:number)=>Math.max(max,0)]:['auto','auto']} tickFormatter={n=>Number(n.toPrecision(4)).toString()} tick={{fill:'#aeb3bd',fontSize:11}}/>
    <Tooltip labelFormatter={at=>new Date(Number(at)).toLocaleString()} formatter={amount=>[metric==='change'?signed(Number(amount)):bnb(Number(amount)),metric==='change'?'Value change':'Value']} contentStyle={{background:'#20232b',border:'1px solid #444b56',borderRadius:10}}/>
    {metric==='change'&&<ReferenceLine y={0} stroke="#737986" strokeDasharray="4 4"/>}
    <Area type="linear" dataKey="amount" baseValue={metric==='change'?0:'dataMin'} stroke={metric==='change'?'url(#'+gradientId+')':'#4be0b1'} fill={metric==='change'?'url(#'+gradientId+')':'#4be0b1'} fillOpacity={.18} strokeWidth={2.5} isAnimationActive={false}/>
   </AreaChart></ResponsiveContainer></div>:<p className="portfolio-empty">{history.length?'First snapshot saved. The chart appears after your holdings value changes.':'Waiting for the first complete holdings snapshot.'}</p>}
  <p>History starts with your first snapshot in this browser. Value changes include trades and inventory changes.</p>
 </section>
}
