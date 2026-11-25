import {useEffect,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Activity,Bell,Bookmark,ChartNoAxesCombined,ChevronDown,Compass,FlaskConical,Gamepad2,Menu,Plus,Rocket,Search,ShieldCheck,Sparkles,UserRound,Wallet,X,Zap} from 'lucide-react'
import {Catalog,type OpenGame} from './components/catalog'
import {Details} from './components/details'
import {Demo} from './components/demo'
import {Developer,Launch} from './components/developer'
import {Button} from './components/ui/button'
import {Revenue} from './components/revenue'
import {Guide} from './components/guide'
import {restore,storageKey} from './lib/storage'
import {initial,num} from './lib/data'
import {refreshActivity} from './lib/sessions'
import type {State} from './lib/model'
import './style.css'
const explorer=[['Discover',Compass],['Trending',Zap],['New Games',Sparkles],['Pre-Migration',Activity],['Migrated',ShieldCheck],['Watchlist',Bookmark]] as const
const dev=[['Developer Hub',ChartNoAxesCombined],['Launch Game',Plus],['Platform Revenue',Wallet]] as const
function load():State{
 try{return restore(localStorage.getItem(storageKey))}catch{return initial()}
}
function route(){
 const [page='Discover',id='',tab='Overview']=location.hash.slice(1).split('/').map(value=>{try{return decodeURIComponent(value)}catch{return value}})
 return {page:page||'Discover',id,tab}
}
function App(){
 const [state,setState]=useState(load)
 const latest=useRef(state)
 const memoryOnly=useRef(false)
 const [storageWarning,setStorageWarning]=useState(false)
 async function update(change:(s:State)=>State):Promise<State>{
  const commit=()=>{
   let base=latest.current
   if(!memoryOnly.current){try{const saved=localStorage.getItem(storageKey);if(saved)base=restore(saved)}catch{/* Continue with the in-memory session. */}}
   const next=change(base)
   latest.current=next;setState(next)
   try{localStorage.setItem(storageKey,JSON.stringify(next));memoryOnly.current=false;setStorageWarning(false)}catch{memoryOnly.current=true;setStorageWarning(true)}
   return next
  }
  return navigator.locks?navigator.locks.request(storageKey,commit):commit()
 }
 const [locationState,setLocationState]=useState(route)
 const [query,setQuery]=useState('')
 const [genre,setGenre]=useState('All Games')
 const [menu,setMenu]=useState(false)
 const [popover,setPopover]=useState('')
 const [toast,notify]=useState('')
 const {page,id,tab}=locationState
 const g=state.games.find(item=>item.id===id)
 const verified=state.games.reduce((n,item)=>n+item.metrics.active,0)
 const totalVolume=state.games.reduce((n,item)=>n+item.volume,0)
 useEffect(()=>{
  update(s=>s)
  const sync=(event:StorageEvent)=>{if(event.key===storageKey&&event.newValue){const next=restore(event.newValue);latest.current=next;setState(next)}}
  window.addEventListener('storage',sync);return ()=>window.removeEventListener('storage',sync)
 },[])
 useEffect(()=>{
  function changed(){setLocationState(route());setMenu(false);setPopover('');window.scrollTo(0,0)}
  window.addEventListener('hashchange',changed)
  return ()=>window.removeEventListener('hashchange',changed)
 },[])
 useEffect(()=>{const timer=window.setInterval(()=>update(s=>refreshActivity(s)),60_000);return ()=>clearInterval(timer)},[])
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>notify(''),3900);return ()=>clearTimeout(timer)},[toast])
 function go(...parts:string[]){const hash=parts.map(encodeURIComponent).join('/');if(location.hash!=='#'+hash)location.hash=hash;else setMenu(false)}
 function navigate(p:string){setQuery('');setGenre('All Games');go(p)}
 const open:OpenGame=(item,newTab='Overview')=>{setQuery('');go('game',item.id,newTab)}
 function toggle(item:string){update(s=>({...s,watch:s.watch.includes(item)?s.watch.filter(v=>v!==item):[...s.watch,item]}))}
 const nav=(list:typeof explorer|typeof dev)=>list.map(([label,Icon])=><button className={page===label&&!query?'active':''} onClick={()=>navigate(label)} key={label}><Icon size={17}/><span>{label}</span>{label==='Watchlist'&&state.watch.length>0&&<small>{state.watch.length}</small>}</button>)
 function search(value:string){setQuery(value);setGenre('All Games');if(page!=='Discover')go('Discover')}
 return <div className="app">
 {menu&&<button className="scrim" aria-label="Close menu" onClick={()=>setMenu(false)}/>}
 <aside className={'sidebar '+(menu?'show':'')}><button className="brand" onClick={()=>navigate('Discover')}><span className="logo"><Gamepad2 size={23} strokeWidth={2.5}/></span><span>Ro<span>Fun</span></span></button><div className="nav-group"><small>EXPLORE</small>{nav(explorer)}</div><div className="nav-group"><small>BUILD</small>{nav(dev)}</div><div className="sidebar-bottom"><button className={'sandbox '+(page==='Demo'?'active':'')} onClick={()=>navigate('Demo')}><FlaskConical size={17}/><span><strong>Demo Mode</strong><small>Simulated environment</small></span></button><div className="sidebar-foot"><i/> BNB Chain Hackathon</div></div></aside>
 <div className="workspace"><header className="topbar"><button className="icon-btn mobile-menu" aria-label="Open menu" onClick={()=>setMenu(!menu)}><Menu size={22}/></button><label className="search"><Search size={18}/><input value={query} onChange={e=>search(e.target.value)} placeholder="Search games, tokens..." aria-label="Search games or tokens"/>{query&&<button aria-label="Clear search" onClick={()=>search('')}><X size={14}/></button>}</label><div className="top-actions"><button className="network" onClick={()=>setPopover(popover==='network'?'':'network')}><span className="bnb-symbol">◈</span> BNB Chain <ChevronDown size={13}/></button><button className="icon-btn bell" aria-label="Notifications" onClick={()=>setPopover(popover==='alerts'?'':'alerts')}><Bell size={19}/><i/></button><Button variant="primary" onClick={()=>{if(state.wallet){setPopover(popover==='wallet'?'':'wallet');return}update(s=>({...s,wallet:true}));notify('Demo wallet connected with virtual BNB')}}><Wallet size={16}/> <span>{state.wallet?state.bnb.toFixed(2)+' BNB':'Connect Wallet'}</span></Button><button className="avatar" aria-label="Profile" onClick={()=>setPopover(popover==='profile'?'':'profile')}><UserRound size={17}/></button></div>
 {popover&&<div className="popover panel"><div className="section-title"><h3>{popover==='alerts'?'Notifications':popover==='network'?'Network':popover==='wallet'?'Demo wallet':'Profile'}</h3><button className="icon-btn" aria-label="Close popup" onClick={()=>setPopover('')}><X size={16}/></button></div>{popover==='alerts'?<p>{state.games.reduce((n,g)=>n+g.suspicious,0)?num(state.games.reduce((n,g)=>n+g.suspicious,0))+' suspicious accounts excluded across the catalog.':'No suspicious player activity detected.'}</p>:popover==='network'?<p>BNB Chain · simulation mode</p>:popover==='wallet'?<><p>{state.bnb.toFixed(4)} virtual BNB</p><Button onClick={()=>{update(s=>({...s,wallet:false}));setPopover('')}}>Disconnect</Button></>:<p>Local demo player · watchlist and gameplay are saved in this browser.</p>}</div>}</header>
 <div className="market-strip"><span><span className="live-dot"/> <strong>SIMULATION MODE</strong></span><span><Gamepad2 size={14}/> <b>{state.games.length}</b> games listed</span><span><ShieldCheck size={14}/> <b>{num(verified)}</b> verified active</span><span><Activity size={14}/> <b>${(totalVolume/1000).toFixed(1)}K</b> 24h volume</span></div>
 <main className="content">
 {storageWarning&&<p className="warning">Browser storage is unavailable. This session’s changes are held in memory.</p>}
 <Guide state={state} update={update} go={go} page={page} id={id} tab={tab}/>
 {page==='game'?(g?<Details key={g.id} g={g} state={state} tab={tab} setTab={t=>go('game',g.id,t)} back={()=>navigate('Discover')} update={update} toggle={()=>toggle(g.id)} notify={notify}/>:<div className="panel"><h1>Game unavailable</h1><Button onClick={()=>navigate('Discover')}>Discover games</Button></div>):page==='Platform Revenue'?<Revenue state={state}/>:page==='Demo'?<Demo startGuide={()=>{update(s=>({...s,guide:0}));navigate('Discover')}} state={state} update={update} open={open} notify={notify}/>:page==='Developer Hub'?<Developer state={state} update={update} launch={()=>navigate('Launch Game')}/>:page==='Launch Game'?<Launch state={state} update={update} open={open}/>:<Catalog state={state} page={page} query={query} genre={genre} setGenre={setGenre} open={open} toggle={toggle} navigate={navigate}/>}
 <footer><span>RoFun · Play First. Graduate Later.</span><span>Local Arena gameplay · Simulated platform statistics and funds.</span></footer>
 </main></div>{toast&&<div className="toast" role="status"><Rocket size={17}/>{toast}</div>}</div>
}
createRoot(document.getElementById('root')!).render(<App/>)
