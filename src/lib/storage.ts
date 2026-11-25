import {initial} from './data'
import {refreshActivity} from './sessions'
import {rewards} from './rewards'
import {rewardBudget} from './economy'
import type {State} from './model'
export const storageKey='rofun.prototype.v1'
export function restore(saved:string|null):State{
 if(!saved)return initial()
 const state=JSON.parse(saved) as State
 if(state.player)return refreshActivity(state)
 const fresh=initial()
 const games=state.games.map(g=>{
  const sessions=g.sessions.map(s=>({...s,account:s.account==='local-demo-player'?fresh.player:s.account,legacyVerified:s.seconds>=12&&s.coins>=2&&s.actions>=8}))
  const rolling=Object.fromEntries(Object.entries(g.rolling??{}).map(([id,ts])=>[id==='local-demo-player'?fresh.player:id,ts]))
  return {...g,description:g.id==='arena'?fresh.games[0].description:g.description,sessions,rolling}
 })
 const spent=games.flatMap(rewards).reduce((n,r)=>n+(r.status==='Claimed'?r.points:0),0)
 return refreshActivity({...fresh,...state,games,rewardPool:Math.max(0,rewardBudget-spent)})
}
