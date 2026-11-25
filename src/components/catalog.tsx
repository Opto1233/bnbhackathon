import {Activity,ArrowRight,Bookmark,ChevronRight,Gamepad2,Play,ShieldCheck,Users,Zap} from 'lucide-react'
import type {Game,State} from '../lib/model'
import {genres,image,money,num} from '../lib/data'
import {graduation} from '../lib/graduation'
import {Button} from './ui/button'
export type OpenGame=(g:Game, tab?:string)=>void
export function GameCard({g,open,watch,toggle}:{g:Game;open:OpenGame;watch:boolean;toggle:()=>void}){
 const status=graduation(g)
 return <article className="game-card"><div className="cover" style={{backgroundImage:`url("${image(g)}")`}}><button className="cover-link" aria-label={`Open ${g.name}`} onClick={()=>open(g)}/><span className="cover-genre">{g.genre}</span><button className={'save '+(watch?'saved':'')} aria-label={watch?'Remove from watchlist':'Save to watchlist'} onClick={toggle}><Bookmark size={15} fill={watch?'currentColor':'none'}/></button></div>
 <div className="card-body"><div className="card-name"><button onClick={()=>open(g)}>{g.name}</button><span>${g.ticker}</span></div><div className="player-line"><span><Users size={14}/><strong>{num(g.metrics.active)}</strong> verified</span><small>{num(g.metrics.unique)} unique</small></div>
 <div className="card-market"><div><small>Market Cap</small><strong>{money(g.cap)}</strong></div><div><small>24h Volume</small><strong>{money(g.volume)}</strong></div><div><small>24h Change</small><strong className={g.change>=0?'green':'red'}>{g.change>=0?'+':''}{g.change}%</strong></div></div>
 <div className="card-progress"><small>{status.status}</small><strong>{status.progress}%</strong></div><div className="track"><i style={{width:status.progress+'%'}}/></div>
 <div className="card-actions"><Button onClick={()=>open(g,'Play')}><Play size={13}/> Play</Button><Button variant="primary" onClick={()=>open(g,'Trading')}>Trade <ArrowRight size={13}/></Button></div></div></article>
}
const groups=['Trending Games','Recommended Games','New Releases','Most Played','Near Graduation','Recently Migrated']
export function Catalog({state,page,query,genre,setGenre,open,toggle,navigate}:{state:State;page:string;query:string;genre:string;setGenre:(v:string)=>void;open:OpenGame;toggle:(id:string)=>void;navigate:(p:string)=>void}){
 const games=state.games
 const hero=games.find(g=>g.featured)??games[0]
 const filtered=games.filter(g=>(genre==='All Games'||genre===g.genre)&&(!query||[g.name,g.ticker,g.genre].some(s=>s.toLowerCase().includes(query.toLowerCase()))))
 const select=(name:string)=>{switch(name){
 case 'Trending Games':return filtered
 case 'Recommended Games':return [...filtered].sort((a,b)=>b.metrics.retention-a.metrics.retention)
 case 'New Releases':return [...filtered].reverse()
 case 'Most Played':return [...filtered].sort((a,b)=>b.metrics.active-a.metrics.active)
 case 'Near Graduation':return filtered.filter(g=>!g.migrated).sort((a,b)=>graduation(b).progress-graduation(a).progress)
 case 'Recently Migrated':return filtered.filter(g=>g.migrated)
 default:return filtered
 }}
 const landing=page==='Discover'&&!query
 const listing=page==='Watchlist'?filtered.filter(g=>state.watch.includes(g.id)):page==='Pre-Migration'?filtered.filter(g=>!g.migrated):page==='Migrated'?select('Recently Migrated'):select(page==='New Games'?'New Releases':page==='Trending'?'Trending Games':page)
 const cards=(entries:Game[])=>entries.length?<div className="card-grid">{entries.map(g=><GameCard key={g.id} g={g} open={open} watch={state.watch.includes(g.id)} toggle={()=>toggle(g.id)}/>)}</div>:<div className="empty panel">{page==='Watchlist'?'Save a game to see it here.':'No games match these filters.'}</div>
 return <>
 <div className="heading"><div><h1>{query?'Search results':page==='Discover'?'Discover Games':page}</h1><p>{query?`Games matching “${query}”`:page==='Discover'?'Play new worlds. Back games with real players.':page==='Watchlist'?'Track your saved games and tokens.':'Explore games and track their Proof of Play progress.'}</p></div><button className="demo-link" onClick={()=>navigate('Demo')}><Zap size={15}/> Hackathon Demo <ChevronRight size={14}/></button></div>
 {landing&&<section className="hero" style={{backgroundImage:`linear-gradient(90deg,#131216 2%,#131216f2 12%,#141216bc 37%,transparent 78%),url("${image(hero)}")`}}><div className="hero-content"><div className="feature"><span/> FEATURED GAME</div><h2>RoFun Arena</h2><div className="hero-tags"><span className="badge yellow">$ARENA</span><span className="badge gray"><Gamepad2 size={13}/> Survival</span><span className="badge gray"><ShieldCheck size={13}/> Proof of Play</span></div><p>{hero.description}</p><div className="hero-actions"><Button variant="primary" onClick={()=>open(hero,'Play')}><Play size={15} fill="currentColor"/> Play Now</Button><Button onClick={()=>open(hero)}>View Game <ArrowRight size={15}/></Button></div></div><div className="hero-live"><span/> {num(hero.metrics.active)} verified active <Activity size={15}/></div></section>}
 {landing&&genre==='All Games'&&<section className="panel"><div className="section-title"><div><h2>Relic Vale</h2><p>Recover relics in a memory vault and trade them with other players.</p></div><Button onClick={()=>open(games.find(g=>g.id==='relic')!,'Play')}>Play Relic Vale</Button></div></section>}
 <div className="filters">{genres.map(item=><button key={item} className={genre===item?'selected':''} onClick={()=>setGenre(item)}>{item==='All Games'&&<Gamepad2 size={15}/>} {item}</button>)}</div>
 {landing?groups.map((name,i)=><section className="catalog-section" key={name}><div className="section-title"><h2>{i===0&&<Zap size={20}/>} {name}</h2><button onClick={()=>navigate(name==='Trending Games'?'Trending':name==='New Releases'?'New Games':name==='Recently Migrated'?'Migrated':name)}>View all <ChevronRight size={15}/></button></div>{cards(select(name).slice(0,4))}</section>):cards(listing)}
 </>
}
