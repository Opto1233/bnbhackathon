import type {Game,State} from './model'
import {rewardBudget} from './economy'
import {defaults} from './graduation'
import {defaultTiers} from './fees'
const roster=[
 ['arena','RoFun Arena','ARENA','Survival',0,842,3820,21,38,8.4,248000,52400,18.6],
 ['neon','Neon District','NEON','FPS',1,1264,8912,24,42,8.8,412000,86400,24.8],
 ['hollow','Hollow Protocol','HOLLOW','Horror',2,638,4302,19,33,7.4,186000,38100,12.4],
 ['velocity','Velocity Underground','VLT','Racing',3,512,2908,18,36,6.1,153000,32100,-4.2],
 ['frontier','Verdant Frontier','VRD','RPG',4,306,1862,17,28,8.5,119000,25800,8.7],
 ['hype','Ashfall Uprising','ASH','Survival',5,24,210,4,9,24,950000,360000,51.2],
 ['organic','Echoes of Orbit','ECHO','Simulation',1,684,5920,23,42,16,124000,28600,6.4],
 ['relic','Relic Vale','RELIC','RPG',2,98,745,16,26,7,52200,9800,-2.6],
 ['grid','Gridshift Rally','GRID','Racing',3,55,312,11,20,3,28000,8200,3.2],
 ['garden','Mosslight Colony','MOSS','Simulation',4,190,1220,24,37,14,98000,13200,4.1],
 ['bastion','Last Bastion','BST','FPS',5,226,1730,17,35,13,82400,19700,-6.3],
 ['sun','Sundown Salvage','SUN','Survival',0,72,430,14,22,4,34000,6400,9.6],
] as const
export const genres=['All Games','FPS','Survival','RPG','Racing','Horror','Simulation']
export function initial():State{
 const games:Game[]=roster.map(([id,name,ticker,genre,art,active,unique,minutes,retention,liquidity,cap,volume,change],index)=>{
  const supply=1e7,price=cap/(600*supply)
  return {id,name,ticker,genre,art,description:id==='arena'?'Race through the neon grid, collect gold coins, and evade the drones. Survive 60 seconds to win.':`Explore ${name}, a fictional Web3 ${genre.toLowerCase()} game with competitive challenges and community-driven progression.`,developer:['RoFun Studios','Night Circuit Labs','Voidlight Games','Redline Interactive','Canopy Works'][index%5],metrics:{active,unique,minutes,retention,liquidity},targets:{...defaults},suspicious:0,cap,volume,change,price,history:Array.from({length:35},(_,i)=>price*(.78+i*.0065+Math.sin(i*1.57+index)*.05+Math.cos(i*.37)*.06)).concat(price),supply,utility:'In-game cosmetics, challenges, and community events.',returning:Math.round(active*retention/100),sessions:[],claimed:[],featured:id==='arena',ready:id==='organic',migrated:index===9||index===10?{id:'SIM-'+ticker+'-0831',date:'2026-11-20T10:00:00Z'}:undefined}
 })
 return {games,watch:[],bnb:50,tokens:{arena:100},trades:[],wallet:false,tiers:defaultTiers,player:crypto.randomUUID(),receipts:[],owned:[],skin:'default',diamond:false,muted:false,rewardPool:rewardBudget,guide:null}
}
export const num=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:1})
export const money=(n:number)=>'$'+Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n)
export const image=(g:Game)=>g.thumbnail||`/art/${g.art}.webp`
