import type {Game,Session,State} from './model'
import {qualifies} from './verification'
const day=86_400_000
function expireRolling(g:Game,now:number):Game{
 const entries=Object.entries(g.rolling??{})
 const current=entries.filter(([,lastSeen])=>now-lastSeen<day)
 if(current.length===entries.length)return g
 return {...g,rolling:Object.fromEntries(current),metrics:{...g.metrics,active:Math.max(0,g.metrics.active-(entries.length-current.length))}}
}
export function refreshActivity(state:State,now=Date.now()):State{
 const games=state.games.map(g=>expireRolling(g,now))
 return games.some((g,i)=>g!==state.games[i])?{...state,games}:state
}
export function recordSession(game:Game,s:Session):Game{
 const g=expireRolling(game,s.at)
 const previous=g.sessions.find(p=>p.id===s.id)
 if(previous&&previous.outcome!=='In progress'||!previous&&s.outcome!=='In progress')return g
 const history=g.sessions.filter(p=>p.id!==s.id)
 const sessions=[...history,s]
 if(!qualifies(s,history))return {...g,sessions}
 const seen=history.some(p=>p.account===s.account&&(qualifies(p)||p.legacyVerified))
 const active=Object.hasOwn(g.rolling??{},s.account)
 const weight=g.verifiedSessions??g.metrics.active
 return {...g,sessions,rolling:{...g.rolling,[s.account]:s.at},verifiedSessions:weight+1,returning:g.returning+(seen&&!active?1:0),metrics:{...g.metrics,active:g.metrics.active+(active?0:1),unique:g.metrics.unique+(seen?0:1),minutes:(g.metrics.minutes*weight+s.activeSeconds!/60)/(weight+1)}}
}
export function localStats(g:Game){
 const sessions=g.sessions.filter(s=>s.events&&s.outcome!=='In progress'&&s.outcome!=='Abandoned')
 const verified=sessions.filter(s=>qualifies(s))
 const players=new Set(verified.map(s=>s.account))
 const mature=Array.from(players).map(player=>verified.filter(s=>s.account===player).map(s=>s.at).sort((a,b)=>a-b)).filter(times=>times[0]+8*day<=Date.now())
 const retained=mature.filter(times=>times.some(at=>at-times[0]>=7*day&&at-times[0]<8*day)).length
 return {sessions,verified,players:players.size,returns:verified.length-players.size,d7:mature.length?Math.round(100*retained/mature.length)+'%':'No mature cohort'}
}
