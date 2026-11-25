import {useEffect,useRef,useState} from 'react'
import {Cat,Gamepad2,Ghost,Megaphone,Orbit,Play,Rabbit,Send,Smile} from 'lucide-react'
import type {Game,State} from '../lib/model'
import type {OpenGame} from './catalog'
import {Button} from './ui/button'
import './community.css'

const friends=[
 {name:'NovaByte',icon:Gamepad2,color:'mint',game:'RoFun Arena'},
 {name:'PixelPloy',icon:Cat,color:'violet'},
 {name:'MintRush',icon:Rabbit,color:'blue'},
 {name:'EchoKai',icon:Ghost,color:'amber'},
 {name:'LunaLoop',icon:Orbit,color:'rose'}
]
export function Friends({arena,open,openSocial}:{arena:Game;open:OpenGame;openSocial:()=>void}){
 const [selected,select]=useState<string|null>(null)
 const friend=friends.find(person=>person.name===selected)
 return <section className="panel friends-panel" aria-label="Friends">
  <div className="section-title"><div><h2>Friends <small>5</small></h2><p><span className="friend-online-dot"/> 1 online · 4 offline <small>· Demo friends</small></p></div><Button onClick={openSocial}><Megaphone size={15}/> Social</Button></div>
  <div className="friends-row">{friends.map(({name,icon:Icon,color,game})=><button key={name} type="button" className="friend-card" aria-pressed={selected===name} onClick={()=>select(selected===name?null:name)}>
   <span className={'friend-avatar '+color}><Icon size={30} aria-hidden="true"/><i className={game?'online':''} aria-hidden="true"/></span>
   <strong>{name}</strong><small>{game?'In game':'Offline'}</small>
  </button>)}</div>
  {friend&&<div className="friend-detail"><div><strong>{friend.name}</strong><p>{friend.game?'Online · Playing '+friend.game:'Offline'}</p></div>
   {friend.game&&<Button variant="primary" onClick={()=>open(arena,'Play')}><Play size={14}/> Open RoFun Arena</Button>}</div>}
 </section>
}
type Post={id:string;body:string;createdAt:number;mine:number;authorLabel:string}
async function requestFeed(player:string,body?:string){
 const headers:Record<string,string>={'X-RoFun-Preview-Player':player}
 if(body!==undefined)headers['Content-Type']='application/json'
 const result=await fetch('/api/community?channel=callouts',{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify({body}),cache:'no-store'})
 const data=await result.json()
 if(!result.ok)throw new Error(data.error||'Community feed unavailable.')
 return data.posts as Post[]
}

const listingId=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
function PostBody({body,games}:{body:string;games:Game[]}){
 return <p>{body.split(/(#[^\s]+)/g).map((word,index)=>{
  const [kind,id]=word.split('/')
  if(kind==='#listing'&&listingId.test(id))return <a key={index} href={'#game/relic/Play/'+id}>View relic listing ↗</a>
  const game=kind==='#game'&&games.find(g=>g.id===id)
  return game?<a key={index} href={'#game/'+encodeURIComponent(game.id)+'/Play'}>Play {game.name} ↗</a>:word
 })}</p>
}
export function Community({state,listing}:{state:State;listing:string}){
 const limit=180
 const [posts,setPosts]=useState<Post[]>([])
 const [draft,setDraft]=useState(listingId.test(listing)?'Relic for sale · #listing/'+listing:'')
 const [status,setStatus]=useState('Loading…')
 const [busy,setBusy]=useState(false)
 const generation=useRef(0)
 useEffect(()=>{
  let active=true
  async function update(){
   const version=++generation.current
   try{
    const entries=await requestFeed(state.player)
    if(active&&version===generation.current){setPosts(entries);setStatus('')}
   }catch(error){if(active&&version===generation.current)setStatus((error as Error).message)}
  }
  void update()
  const timer=window.setInterval(update,4000)
  return ()=>{active=false;window.clearInterval(timer)}
 },[state.player])
 return <div className="community-page">
  <div className="heading"><div><h1><Megaphone size={24}/> Social</h1><p>Find teammates, invite players to a game, or tell the community what you’re trading.</p></div></div>
  <section className="panel community-feed" aria-label="Social posts">
   {posts.length===0&&<div className="community-empty"><Megaphone size={32}/><h3>Start a post</h3><p>Tell other players what game you’re in and what you’re looking for.</p></div>}
   <ol aria-live="polite">{posts.map(post=><li key={post.id}><span className="community-avatar"><Smile size={18}/></span><div><div className="community-meta"><strong>{post.mine?'You':post.authorLabel}</strong><time dateTime={new Date(post.createdAt).toISOString()}>{new Date(post.createdAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time></div><PostBody body={post.body} games={state.games}/></div></li>)}</ol>
  </section>
  <form className="panel community-compose" onSubmit={async event=>{
   event.preventDefault()
   if(!draft.trim()||busy)return
   setBusy(true)
   try{
    const entries=await requestFeed(state.player,draft)
    generation.current++
    setPosts(entries);setDraft('');setStatus('')
   }catch(error){setStatus((error as Error).message)}finally{setBusy(false)}
  }}>
   <label className="field">Post<textarea maxLength={limit} rows={2} value={draft} placeholder="Looking for players in Relic Vale…" onChange={event=>setDraft(event.target.value)}/></label>
   <label className="field">Attach game<select value="" onChange={e=>{const tag=' #game/'+e.target.value;if(e.target.value&&draft.length+tag.length<=limit)setDraft(draft+tag)}}><option value="">Choose a game</option>{state.games.map(g=><option key={g.id} value={g.id} disabled={draft.length+g.id.length+7>limit}>{g.name}</option>)}</select></label>
   <div><span role="status">{status}</span><small>{draft.length}/{limit}</small><Button type="submit" variant="primary" disabled={busy||!draft.trim()}><Send size={15}/> Publish post</Button></div>
  </form>
 </div>
}
