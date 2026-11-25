import type {ArenaPoint} from './arena-art'
import type {PlayEvent,Session} from './model'
const clamp=(v:number,low:number,high:number)=>Math.max(low,Math.min(high,v))
const distance=(a:ArenaPoint,b:ArenaPoint)=>Math.hypot(a.x-b.x,a.y-b.y)
type Drone=ArenaPoint & {near:boolean}
export class Round {
 readonly id=crypto.randomUUID()
 readonly player={x:92,y:180}
 enemies:Drone[]=[{x:682,y:38,near:false}]
 coins=[{x:156,y:180},{x:226,y:180},{x:302,y:180},{x:454,y:100},{x:560,y:272}]
 trail:ArenaPoint[]=[]
 events:PlayEvent[]=[]
 elapsed=0; active=0; moves=0; gold=0; encounters=0; health=4; angle=0; immunity=0
 private nextSpawn=10
 private nextMove=.4
 private nextTrail=0
 constructor(readonly account:string){this.log('Started','Entered the grid')}
 get score(){return this.gold*100+Math.floor(this.active)*5}
 log(kind:PlayEvent['kind'],detail:string){this.events.push({kind,time:Math.floor(this.elapsed*10)/10,detail})}
 step(dt:number,dx:number,dy:number){
  this.elapsed=Math.min(60,this.elapsed+dt)
  const direction=Math.hypot(dx,dy)
  if(direction){
   const old={...this.player}
   this.player.x=clamp(old.x+dx/direction*214*dt,14,706)
   this.player.y=clamp(old.y+dy/direction*214*dt,14,346)
   const traveled=distance(old,this.player)
   if(traveled>.01){
    this.angle=Math.atan2(dy,dx)
    this.active+=Math.min(dt,traveled/214)
    if(this.active>=this.nextMove){this.moves++;this.nextMove+=.4;this.log('Movement',Math.round(this.player.x)+', '+Math.round(this.player.y))}
    if(this.elapsed>=this.nextTrail){this.trail=[...this.trail.slice(-11),old];this.nextTrail=this.elapsed+.045}
   }
  }
  for(const coin of this.coins){
   if(distance(this.player,coin)<19){
    this.gold++;this.log('Coin','Gold collected · '+this.gold)
    coin.x=30+Math.random()*660;coin.y=30+Math.random()*300
   }
  }
  if(this.elapsed>=this.nextSpawn){
   this.enemies.push({x:this.player.x<360?700:20,y:this.player.y<180?338:22,near:false})
   this.nextSpawn+=Math.max(5,10-this.elapsed*.06)
  }
  this.immunity=Math.max(0,this.immunity-dt)
  for(const drone of this.enemies){
   const angle=Math.atan2(this.player.y-drone.y,this.player.x-drone.x)
   const speed=35+this.elapsed*.72
   drone.x+=Math.cos(angle)*speed*dt;drone.y+=Math.sin(angle)*speed*dt
   const gap=distance(this.player,drone)
   if(gap<56&&!drone.near){drone.near=true;this.encounters++;this.log('Encounter','Drone entered proximity')}
   if(gap>72)drone.near=false
   if(gap<21&&!this.immunity){
    this.health--;this.immunity=1.8;this.log('Damage',this.health+' shields remaining')
    drone.x=clamp(drone.x-Math.cos(angle)*95,15,705);drone.y=clamp(drone.y-Math.sin(angle)*95,15,345)
   }
  }
 }
 snapshot(outcome:Session['outcome']):Session{
  return {id:this.id,account:this.account,at:Date.now(),seconds:Math.floor(this.elapsed),activeSeconds:Math.floor(this.active),coins:this.gold,actions:this.moves,score:this.score,encounters:this.encounters,outcome,events:[...this.events]}
 }
}
