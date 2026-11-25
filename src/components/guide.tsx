import type {State} from '../lib/model'
import type {Update} from './details'
import {qualifies} from '../lib/verification'
import {graduation} from '../lib/graduation'
import {Button} from './ui/button'
const discover=['Discover'],arena=['game','arena','Overview'],play=['game','arena','Play'],dev=['Developer Hub'],analytics=['game','arena','Player Analytics'],trading=['game','arena','Trading'],treasury=['Platform Revenue'],demo=['Demo']
export function Guide({state,update,go,page,id,tab}:{state:State;update:Update;go:(...parts:string[])=>void;page:string;id:string;tab:string}){
 const index=state.guide
 if(index===null)return null
 const game=state.games.find(g=>g.id==='arena')!,target=state.games.find(g=>g.id==='hype')!
 const verified=game.sessions.some(s=>qualifies(s))
 const bought=state.receipts.some(t=>t.kind==='Cosmetic')
 const traded=state.receipts.some(t=>t.kind==='Trade'&&t.game==='arena')
 const stages:[string,string[],string,boolean][]=[
  ['Open Discover',discover,'Find the featured RoFun Arena game.',true],
  ['Select RoFun Arena',arena,'Inspect the game listing and its Proof of Play requirements.',true],
  ['Play the Arena',play,'Start a round. The first three gold coins lie directly to your right.',game.sessions.some(s=>s.events)],
  ['Verify a session',play,'Keep moving for 30 active seconds, take 20 movement samples and collect 3 coins. Finish the round.',verified],
  ['Inspect gameplay events',dev,'Open the Developer Mode event log for your completed run.',verified],
  ['Review player analytics',analytics,'Compare local sessions and unique players with the seeded platform figures.',verified],
  ['Buy and equip a cosmetic',play,'Use the Arena store, then equip your purchase.',bought&&(state.skin!=='default'||state.diamond)],
  ['Inspect the 1% fee',play,'Read the latest cosmetic receipt underneath the store.',bought],
  ['Trade the Arena token',trading,'Preview a RoFun paper trade and confirm the displayed fee.',traded],
  ['Trace the trading fee',trading,'Read the RoFun treasury fee in recent paper trades.',traded],
  ['Open Platform Revenue',treasury,'Inspect the fee breakdown, developer distribution and treasury balance.',true],
  ['Inspect graduation gates',demo,'Use Ashfall Uprising to compare the five requirements.',true],
  ['Simulate a bot attack',demo,'Add suspicious accounts to Ashfall. Its verified metrics stay fixed.',target.suspicious>0],
  ['Meet every requirement',demo,'Apply the simulated graduation requirements to Ashfall.',graduation(target).passed===5],
  ['Execute simulated migration',demo,'Migrate Ashfall and inspect the simulated migration receipt.',!!target.migrated]
 ]
 const [label,path,help,ready]=stages[index]
 const here=page===path[0]&&(page!=='game'||id===path[1]&&tab===path[2])
 function advance(){
  const next=index!+1
  update(s=>({...s,guide:next<stages.length?next:null}))
  if(next<stages.length)go(...stages[next][1])
 }
 return <section className="panel guide"><div><small>Guided demo · {index+1} of {stages.length}</small><h3>{label}</h3><p>{help}</p></div><div className="hero-actions">{here?<Button variant="primary" disabled={!ready} onClick={advance}>{index===14?'Finish guide':'Next step'}</Button>:<Button variant="primary" onClick={()=>go(...path)}>Open step</Button>}<Button onClick={()=>update(s=>({...s,guide:null}))}>Exit guide</Button></div></section>
}
