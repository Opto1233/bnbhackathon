import type {Game, Receipt, State} from './model'
import {rewards} from './rewards'

export const launchFee = .05
export const rewardBudget = 50_000
export const cosmetics = [
 {id:'gold',name:'Golden Knight Skin',price:20,description:'Gilded armor and a sunlit visor.'},
 {id:'ninja',name:'Cyber Ninja Skin',price:30,description:'A violet hood with twin energy blades.'},
 {id:'ghost',name:'Neon Ghost Skin',price:50,description:'A spectral outline in electric mint.'},
 {id:'diamond',name:'Diamond Trail',price:10,description:'A wake of bright crystal fragments.'},
 {id:'founder',name:'Arena Founder Cosmetic Pack',price:80,description:'Founder regalia with the Diamond Trail included.'}
]
export const roundBNB=(value:number)=>Math.round(value*1e8)/1e8
export const bnb=(value:number)=>value.toLocaleString('en-US',{maximumFractionDigits:8})+' BNB'
export function receipt(state:State,game:string,kind:Receipt['kind'],label:string,gross:number,platform:number,developer=0):Receipt{
 return {id:crypto.randomUUID(),at:Date.now(),account:state.player,game,kind,label,gross:roundBNB(gross),platform:roundBNB(platform),developer:roundBNB(developer)}
}
export function purchase(state:State,id:string):State{
 const item=cosmetics.find(v=>v.id===id)
 if(!item||state.owned.includes(id)||(state.tokens.arena??0)<item.price)return state
 const half=roundBNB(item.price*.005)
 const entry={...receipt(state,"arena","Cosmetic",item.name,item.price,half,item.price-2*half),currency:"ARENA",burned:half}
 return {...state,tokens:{...state.tokens,arena:roundBNB(state.tokens.arena-item.price)},games:state.games.map(g=>g.id==="arena"?{...g,supply:roundBNB(g.supply-half),cap:g.price*600*(g.supply-half)}:g),owned:[...new Set([...state.owned,id,...(id==='founder'?['diamond']:[])])],receipts:[entry,...state.receipts]}
}
export function equip(state:State,id:string):State{
 if(id!=='default'&&!state.owned.includes(id))return state
 return id==='diamond'?{...state,diamond:!state.diamond}:{...state,skin:id,diamond:id==='founder'||state.diamond}
}
export function launchGame(state:State,game:Game):State{
 if(state.bnb<launchFee||state.games.some(g=>g.id===game.id||g.ticker.toLowerCase()===game.ticker.toLowerCase()))return state
 return {...state,games:[...state.games,{...game,chainId:56,gasToken:"BNB"}],bnb:roundBNB(state.bnb-launchFee),receipts:[receipt(state,game.id,'Launch',game.name+' token launch',launchFee,launchFee),...state.receipts]}
}
export function claimReward(state:State,gameId:string,id:string):State{
 const game=state.games.find(g=>g.id===gameId)
 const milestone=game&&rewards(game).find(m=>m.id===id)
 if(!game||milestone?.status!=='Unlocked'||state.rewardPool<milestone.points)return state
 return {...state,rewardPool:state.rewardPool-milestone.points,games:state.games.map(g=>g.id===gameId?{...g,claimed:[...g.claimed,id]}:g)}
}
export const sum=(items:Receipt[],field:'platform'|'developer'|'gross')=>roundBNB(items.reduce((n,t)=>n+t[field],0))
