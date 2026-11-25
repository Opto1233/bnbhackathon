import {useEffect,useRef,useState} from 'react'
import {Gamepad2,Play,Volume2,VolumeX} from 'lucide-react'
import type {Session,State} from '../lib/model'
import {Round} from '../lib/round'
import {drawArena} from '../lib/arena-art'
import {qualifies} from '../lib/verification'
import {recordSession} from '../lib/sessions'
import {Button} from './ui/button'
import {Store} from './store'
import {updateGame,type Update} from './details'

const controls=[['arrowleft','←'],['arrowup','↑'],['arrowdown','↓'],['arrowright','→']]
export function Arena({state,update}:{state:State;update:Update}){
 const canvas=useRef<HTMLCanvasElement>(null)
 const keys=useRef(new Set<string>())
 const sound=useRef<AudioContext|null>(null)
 const latest=useRef({state,update});latest.current={state,update}
 const [round,setRound]=useState<Round|null>(null)
 const [result,setResult]=useState<Session|null>(null)
 const [tick,refresh]=useState(0)
 const [paused,setPaused]=useState(false)
 const isPaused=useRef(false)
 const sessions=state.games.find(g=>g.id==='arena')!.sessions
 function save(s:Session){latest.current.update(prev=>updateGame(prev,'arena',g=>recordSession(g,s)))}
 function tone(freq:number){
  const audio=sound.current
  if(!audio||latest.current.state.muted||audio.state!=='running')return
  const osc=audio.createOscillator(),gain=audio.createGain()
  osc.type='triangle';osc.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(.075,audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.13);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.14)
 }
 function start(){
  try{sound.current??=new AudioContext();void sound.current.resume().catch(()=>{})}catch{/* Audio is optional on silent devices. */}
  const next=new Round(state.player)
  keys.current.clear();isPaused.current=false;setPaused(false);setResult(null);save(next.snapshot('In progress'));setRound(next)
  requestAnimationFrame(()=>canvas.current?.scrollIntoView({block:'center'}))
 }
 function pause(value:boolean){keys.current.clear();isPaused.current=value;setPaused(value)}
 useEffect(()=>()=>{void sound.current?.close()},[])
 useEffect(()=>{
  const ctx=canvas.current?.getContext('2d')
  if(!ctx)return
  if(!round){
   drawArena(ctx,{player:{x:150,y:174},enemies:[{x:560,y:90},{x:610,y:260}],coins:[{x:210,y:200},{x:270,y:186},{x:478,y:126}],skin:latest.current.state.skin,time:0})
   return
  }
  let frame=0,last=performance.now(),lastHud=0,ended=false
  const stopOnBlur=()=>pause(true)
  const hidden=()=>{if(document.hidden)pause(true)}
  const down=(event:KeyboardEvent)=>{
   const key=event.key.toLowerCase()
   if(!['w','a','s','d',...controls.map(c=>c[0])].includes(key)||isPaused.current||/INPUT|SELECT|TEXTAREA/.test((event.target as HTMLElement)?.tagName))return
   event.preventDefault();keys.current.add(key)
  }
  const up=(event:KeyboardEvent)=>keys.current.delete(event.key.toLowerCase())
  function frameStep(now:number){
   const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now
   if(!isPaused.current){
    const held=(a:string,b:string)=>Number(keys.current.has(a)||keys.current.has(b))
    const oldCoins=round!.gold,oldHealth=round!.health
    round!.step(dt,held('d','arrowright')-held('a','arrowleft'),held('s','arrowdown')-held('w','arrowup'))
    if(oldCoins<round!.gold)tone(920)
    if(oldHealth>round!.health)tone(120)
   }
   const {skin,diamond}=latest.current.state
   drawArena(ctx!,{...round!,time:round!.elapsed,skin,diamond,invulnerable:round!.immunity>0})
   if(now-lastHud>120){refresh(n=>n+1);lastHud=now}
   if(round!.elapsed>=60||!round!.health){
    ended=true
    const outcome=round!.health?'Victory':'Game over'
    round!.log('Completed',outcome+' · score '+round!.score)
    const session=round!.snapshot(outcome);save(session);tone(round!.health?760:90);setResult(session);setRound(null);return
   }
   frame=requestAnimationFrame(frameStep)
  }
  function abandon(){if(ended)return;ended=true;round!.log('Abandoned','Left the arena');save(round!.snapshot('Abandoned'))}
  window.addEventListener('pagehide',abandon);window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',stopOnBlur);document.addEventListener('visibilitychange',hidden)
  frame=requestAnimationFrame(frameStep)
  return ()=>{cancelAnimationFrame(frame);abandon();window.removeEventListener('pagehide',abandon);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',stopOnBlur);document.removeEventListener('visibilitychange',hidden)}
 },[round])
 const board=sessions.filter(s=>s.outcome==='Victory'||s.outcome==='Game over').sort((a,b)=>b.score!-a.score!).slice(0,8)
 return <><section className="panel arena-panel"><div className="section-title"><h2><Gamepad2 size={20}/> RoFun Arena</h2><Button aria-label={state.muted?'Unmute sound':'Mute sound'} onClick={()=>update(s=>({...s,muted:!s.muted}))}>{state.muted?<VolumeX size={15}/>:<Volume2 size={15}/>}</Button></div>
 <div className="arena-stats" data-hud={tick}><span>Shields <strong>{round?.health??(result?.outcome==='Game over'?0:4)}/4</strong></span><span>Time left <strong>{round?Math.ceil(60-round.elapsed):result?60-result.seconds:60}s</strong></span><span>Gold <strong>{round?.gold??result?.coins??0}</strong></span><span>Score <strong>{round?.score??result?.score??0}</strong></span></div>
 <div className="arena-board"><canvas ref={canvas} width={720} height={360} aria-label="RoFun Arena playfield"/>{(!round||paused)&&<div className="arcade-overlay"><h2>{paused&&round?'Paused':result?.outcome??'RoFun Arena'}</h2><p>{paused&&round?'Resume when you’re ready.':result?'Score '+result.score+' · '+result.coins+' gold coins':'Collect gold. Dodge the drones. Survive 60 seconds.'}</p><Button variant="primary" onClick={round?()=>pause(false):start}><Play size={15}/>{round?'Resume round':result?'Play again':'Start game'}</Button></div>}</div>
 {round&&<div className="dpad">{controls.map(([key,label])=><Button key={key} aria-label={key.replace('arrow','Move ')} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(key)}} onLostPointerCapture={()=>keys.current.delete(key)} onPointerUp={()=>keys.current.delete(key)} onPointerCancel={()=>keys.current.delete(key)}>{label}</Button>)}<Button onClick={()=>pause(!paused)}>{paused?'Resume':'Pause'}</Button></div>}
 <p>Steer with WASD, arrow keys, or the touch controls. Finish a round with 30 active seconds, 20 movement samples, and 3 coins to qualify. Moving against a wall gives no active time.</p>
 {result&&<div role="status" className={qualifies(result)?'success':'warning'}><div><strong>{qualifies(result)?'Session verified':'Session did not qualify'}</strong><br/>{result.activeSeconds}s active · {result.actions} movements · {result.coins} coins · {result.encounters} encounters</div></div>}</section>
 <Store state={state} update={update}/><section className="panel"><h2>Local leaderboard</h2>{board.length?board.map((s,i)=><div className="list-row" key={s.id}><strong>#{i+1} · {s.score} pts</strong><span>{s.outcome} · {s.coins} gold · {new Date(s.at).toLocaleTimeString()}</span></div>):<p>Finish a round to set the first score in this browser.</p>}</section></>
}
