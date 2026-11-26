'use strict';
const $=q=>document.querySelector(q), pages=['Login','Trending','Search','Clips','Trading','Inbox','Profile'], day=86400000, fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2}), esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const epoch=Date.now(), names=['Tokyo Afterhours','Ocean Motion','Stereo Club','Pasta Studio'], titles=['When I text “almost there”','Trying to make it to Friday','When they hand me the aux','My definition of a little cheese'], tags=['NEON','WAVE','BEAT','PASTA'];
function hist(total,i){return [35,30,7,1,.7,.4,.15,0].map((d,j)=>[epoch-day*d,Math.round(total*[.02,.08,.22,.42,.48,.56,.86,1][j])]);}
function seed(){let channels=names.map((name,i)=>({id:String(i+1),name,coin:tags[i],prices:hist([4.8,3.2,2.1,1.6][i]*100,i).map(([t,v])=>[t,v/100]),supply:1000000,followers:hist(38000/(i+1),i),following:16+i}));return {channels,clips:titles.map((title,i)=>({id:String(i+1),owner:String(i+1),title,views:hist([248600,142800,86400,47200][i],i),likes:4200-i*800})),cash:10000,hold:{},closed:channels.map((c,i)=>({owner:c.id,t:epoch-day*.4,pnl:1200-i*310})),likes:[],saves:[],reposts:[]};}
const shared = window.pulseShared;
let sharedProfileStatus=shared?'loading':'ready';
const stateKey = shared ? 'pulse-shared-ui:' + window.PULSE_CONFIG.url : 'pulse-demo-v1';
const myId = () => shared && window.pulseWallet.signed() ? shared.userId : 'me';
function readStore(key,valid){
  try{
    const raw=localStorage.getItem(key);
    if(!raw)return null;
    const value=JSON.parse(raw);
    if(valid(value))return value;
  }catch{}
  try{const raw=localStorage.getItem(key);if(raw)localStorage.setItem(key+':recovery',raw);}catch{}
  return null;
}
const initialState=readStore(stateKey,v=>v&&['channels','clips','closed','saves','likes','reposts'].every(k=>Array.isArray(v[k]))&&v.channels.every(c=>c&&typeof c.name==='string'&&Array.isArray(c.followers))&&v.clips.every(c=>c&&typeof c.title==='string'&&Array.isArray(c.views)&&v.channels.some(ch=>ch.id===c.owner)));
let s={...seed(),...initialState}, period=0, category=2, metric=0, tab=0,side='buy', query='',observer, uploadDB, urls={},noticeTimer;
const privateDefaults={likes:[],reposts:[],saves:[],messages:{},reports:{},watchlist:[],demoCommentLikes:[],profileFollows:{}};
let accountScope,communityReady=false,communityFailed=false,community={moments:[],comments:[],reactions:[],messages:[]},communitySerial=0;
function switchAccount(){
  const scope=window.pulseWallet.account?.()||myId();
  if(scope===accountScope)return;
  const data=readStore(stateKey+':private:'+scope,v=>v&&typeof v==='object')||(!shared&&scope==='me'?initialState:null)||{};
  for(const [key,fallback] of Object.entries(privateDefaults)){
    const value=data[key];
    s[key]=value&&typeof value==='object'&&Array.isArray(value)===Array.isArray(fallback)?value:structuredClone(fallback);
  }
  accountScope=scope;
  community.messages=[];communitySerial++;
}
switchAccount();
const punchlines=['Still looking for the station.','Monday has entered the chat.','Same song. Twelfth time.','Say when. Keep going. Keep going.'];
for(const c of s.clips){
  const index=Number(c.id)-1;
  if(c.owner===c.id && titles[index]) c.title=titles[index];
}
const demoShorts=[
  ['reaction','Pulse Arcade','The last second','#StreamerReaction','#Gaming'],
  ['kimchi','Pulse Kitchen','Kimchi crunch','#Kimchi','#Food'],
  ['myth','Pulse Lore','The trickster','#MythologyEdit','#NorseLore'],
  ['bot','Pulse Workshop','Tiny bot, big plans','#LittleBot','#Robotics']
];
const pausedReelIds=new Set(['reaction','kimchi','bot']);
const classicHashtags=[['#StreetLife','#CityNights'],['#Surfing','#Outdoors'],['#DJSet','#Music'],['#Cooking','#Food']];
for(const [index,[id,name,title,...hashtags]] of demoShorts.entries()){
  if(!s.channels.some(channel=>channel.id===id))s.channels.push({id,name,followers:[],following:0});
  if(!s.clips.some(reel=>reel.id===id)){
    const position=s.clips.findIndex(reel=>reel.id===String(index+1));
    s.clips.splice(position+1,0,{id,owner:id,title,hashtags,views:hist(13800-index*1600,index),likes:0});
  }
}
function reelHashtags(reel){
  return reel.hashtags||classicHashtags[Number(reel.id)-1]||reel.title.match(/#[\p{L}\p{M}\p{N}_]+/gu)||[];
}
function trendingHashtags(){
  const since=Date.now()-day, tags=new Map();
  for(const reel of s.clips){
    if(pausedReelIds.has(reel.id))continue;
    const unique=new Map(reelHashtags(reel).map(name=>[name.toLowerCase(),name]));
    for(const [tag,name] of unique){
      const item=tags.get(tag)||{name,views:0,reels:0};
      item.views+=stats(reel.views,since).delta;
      item.reels++;
      tags.set(tag,item);
    }
  }
  return [...tags.values()].sort((a,b)=>b.views-a.views||a.name.localeCompare(b.name)).slice(0,8);
}
const priceText=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:6});
function save(){
  if(shared&&initialState&&!initialState.privateStorageVersion&&!localStorage.getItem(stateKey+':legacy')){
    localStorage.setItem(stateKey+':legacy',JSON.stringify(initialState));
  }
  const visible={...s,privateStorageVersion:1}, personal={};
  for(const key of Object.keys(privateDefaults)){personal[key]=s[key];visible[key]=structuredClone(privateDefaults[key]);}
  if(shared){visible.channels=s.channels.filter(c=>!c.shared);visible.clips=s.clips.filter(c=>!c.shared);}
  localStorage.setItem(stateKey+':private:'+accountScope,JSON.stringify(personal));
  localStorage.setItem(stateKey,JSON.stringify(visible));
}
const chan=id=>s.channels.find(c=>c.id===id), clip=id=>s.clips.find(c=>c.id===id), self=()=>chan(myId()),last=a=>a.at(-1)?.[1]||0, cut=()=>period===3?-Infinity:Date.now()-[1,7,30][period]*day, pnl=id=>s.closed.filter(x=>x.owner===id&&x.t>=cut()).reduce((a,b)=>a+b.pnl,0);
function stats(history,start=cut()){
  const points=Array.isArray(history)?history.filter(point=>Array.isArray(point)&&Number.isFinite(point[0])&&Number.isFinite(Number(point[1]))):[];
  const baseline=points.filter(([time])=>time<=start).at(-1)?.[1]??(start===-Infinity?points[0]?.[1]:null);
  if(baseline==null)return {delta:null,pct:null};
  const delta=(points.at(-1)?.[1]??baseline)-baseline;
  return {delta,pct:baseline?delta/baseline*100:null};
}
function growth(n){return n===null?'No baseline yet':(n>=0?'+':'')+fmt(n)+'%';}
function graph(a,mini=false,start=-Infinity){let prev=a.filter(x=>x[0]<=start).at(-1),points=a.filter(x=>x[0]>start);if(Number.isFinite(start))points.unshift([start,prev?.[1]||0]);if(!points.length)points=[[0,0]];let min=Math.min(...points.map(x=>x[1])),max=Math.max(...points.map(x=>x[1])),t=points[0][0],span=points.at(-1)[0]-t||1;let coords=points.map(([x,y])=>[(x-t)/span*200,48-(y-min)/(max-min||1)*43].join(',')).join(' ');return '<svg role="img" aria-label="Trend over time" class="'+(mini?'mini':'chart')+'" viewBox="0 0 200 52" preserveAspectRatio="none"><polygon points="0,52 '+coords+' 200,52" fill="#bfe95013"/><polyline points="'+coords+'" fill="none" stroke="#c9ef61" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';}
const link=(label,path,cl='link')=>'<a class="'+cl+'" href="#'+esc(path)+'">'+label+'</a>',btn=(label,act,cl='')=>'<button class="'+cl+'" data-act="'+act+'">'+label+'</button>',image=c=>c.shared||c.owner==='me'?'':"background-image:url(media/"+c.id+".jpg)",path=()=>decodeURIComponent(location.hash.slice(1)||'Clips').split('/'),go=p=>{if(path().join('/')===p)render();else location.hash=p;},heading=(name,sub,extra='')=>'<div class="headline"><div><h1>'+name+'</h1><p>'+sub+'</p></div>'+extra+'</div>', chip=(label,act,sel)=>btn(label,act,sel?'selected':'');
function cards(items){return items.length?'<div class="cards">'+items.map(c=>{let ch=chan(c.owner),g=stats(c.views,Date.now()-day);return '<article class="card"><button class="tile" aria-label="Play '+esc(c.title)+'" style="'+image(c)+'" data-go="Clips/'+c.id+'"><b>▷ '+fmt(last(c.views))+'</b></button><div class="details"><h3>'+link(esc(c.title),'Clips/'+c.id)+'</h3><small>'+link(esc(ch.name),'Profile/'+ch.id)+'</small><div class="metrics"><span class="positive">'+growth(g.pct)+'</span>'+graph(c.views,true,Date.now()-day)+'</div><small>'+(g.delta==null?'24h change unknown':(g.delta>=0?'+':'')+fmt(g.delta)+' views · 24h')+'</small></div></article>';}).join('')+'</div>':'<p class="muted">No videos here yet.</p>';}
function market(c){return '<button class="market" data-go="Trading/'+c.id+'"><b class="coin">'+esc(c.coin[0])+'</b><span><strong>$'+esc(c.coin)+'</strong><small>'+esc(c.name)+'</small></span>'+'<b>tBNB</b></button>';}
function trending(){let items=s.clips.slice().sort((a,b)=>stats(b.views,Date.now()-day).delta-stats(a.views,Date.now()-day).delta),c=items[0];return heading('Trending','Discover the fastest-growing videos and creators.','<span class="muted">◷ &nbsp;24 hours</span>')+'<div class="heroGrid"><article class="hero" style="'+image(c)+'"><span class="tag">↗ &nbsp; TRENDING #1</span><div class="body">'+link(esc(chan(c.owner).name),'Profile/'+c.owner)+'<h2>'+esc(c.title)+'</h2><div class="row">'+link('▶ &nbsp; Play video','Clips/'+c.id,'primary')+'<span>◉ '+fmt(last(c.views))+' views</span></div></div></article><section class="panel"><h2>Creator coins</h2>'+s.channels.filter(c=>c.coin).slice(0,4).map(market).join('')+'</section></div><div class="sectionhead"><h2>Trending videos</h2>'+link('View leaderboard','Search/Leaderboard')+'</div>'+cards(items);}
function viewTabs(label, options, selected, action){
  return '<div class="viewTabs" role="group" aria-label="'+label+'">'+options.map(([id,name])=>
    '<button type="button" data-act="'+action+':'+id+'" aria-pressed="'+(id===selected)+'">'+name+'</button>'
  ).join('')+'</div>';
}
function reelThumb(reel, className=''){
  if(!reel)return '';
  const preview=reel.media || (reel.owner==='me'&&urls[reel.id])
    ? '<video src="'+esc(reel.media || urls[reel.id])+'" muted playsinline preload="metadata" aria-hidden="true"></video>' : '';
  return '<button type="button" class="reelThumb '+className+'" data-go="Clips/'+esc(reel.id)+'" aria-label="Play '+esc(reel.title)+'" style="'+image(reel)+'">'+preview+'<span>▷ '+fmt(last(reel.views))+'</span></button>';
}
function handleFor(channel){
  const stem=channel?.name.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,'_').replace(/^_|_$/g,'')||'creator';
  return channel?.shared?stem+'~'+channel.id:channel?.id==='me'?stem+'~me':stem;
}
function initial(name){
  const value=String(name||'');
  try{
    const segmenter=Intl.Segmenter?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
    return segmenter?.segment(value)[Symbol.iterator]().next().value?.segment||Array.from(value)[0]||'';
  }catch{return Array.from(value)[0]||'';}
}
function followerTotal(channel){
  const local=Object.values(s.profileFollows||{}).filter(ids=>ids.includes(channel.id)).length;
  return last(channel.followers)+local+community.reactions.filter(r=>r.kind==='follow'&&r.target===channel.id).length;
}
function profileAvatar(channel,className){
  const image=channel?.avatar?'<img class="profileAvatarImage" src="'+esc(channel.avatar)+'" alt="">':'';
  return '<span class="'+className+'" aria-hidden="true">'+esc(initial(channel?.name).toUpperCase())+image+'</span>';
}
function exploreProfileLink(channel,title,subtitle,route){
  return '<div class="exploreRow">'+link(profileAvatar(channel,'exploreAvatar')+
    '<span class="exploreProfileName"><strong>'+esc(title)+'</strong>'+
    (subtitle?'<small>'+esc(subtitle)+'</small>':'')+'</span>',route,'exploreTitle exploreProfileLink')+'</div>';
}
let exploreTab='all', exploreLimit=24;
function trendingCreators(){
  const gains=new Map(),since=Date.now()-day;
  for(const reel of s.clips){
    if(pausedReelIds.has(reel.id))continue;
    const views=stats(reel.views,since).delta;
    if(views>0)gains.set(reel.owner,(gains.get(reel.owner)||0)+views);
  }
  const top=[...gains].filter(([id])=>chan(id)).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(!top.length)return '';
  return '<section class="trendingCreators"><h2>Trending Creators</h2>'+top.map(([id,gain])=>{
    const creator=chan(id);
    return exploreProfileLink(creator,creator.name,'+'+fmt(gain)+' views · 24h','Profile/'+id);
  }).join('')+'</section>';
}
function exploreResults(){
  const q=query.trim().toLowerCase(), matches=(...values)=>values.some(value=>String(value||'').toLowerCase().includes(q));
  if(exploreTab==='following'){
    const following=new Set(followedProfiles());
    const people=s.channels.filter(c=>following.has(c.id)&&matches(c.name,'@'+handleFor(c),c.coin));
    const videos=newest(s.clips.filter(c=>following.has(c.owner)&&!pausedReelIds.has(c.id)&&matches(c.title,chan(c.owner)?.name,...reelHashtags(c))));
    if(!following.size)return '<p class="emptyView">Follow creators to see their videos here.</p>'+btn('Find creators','explore:channels','subtle');
    if(!people.length&&!videos.length)return '<p class="emptyView">'+(q?'No matching creators or videos.':'No videos from followed creators yet.')+'</p>';
    return (people.length?'<section><h2>Creators you follow</h2>'+people.slice(0,exploreLimit).map(c=>exploreProfileLink(c,c.name,fmt(followerTotal(c))+' followers','Profile/'+c.id)).join('')+'</section>':'')+
      '<section><h2>Latest videos</h2>'+cards(videos.slice(0,exploreLimit))+'</section>'+
      (Math.max(people.length,videos.length)>exploreLimit?btn('Show more','moreExplore','subtle'):'');
  }
  const show=id=>exploreTab==='all'||exploreTab===id;
  const reels=!show('reels')?[]:s.clips.filter(c=>!pausedReelIds.has(c.id)&&matches(c.title,chan(c.owner)?.name,chan(c.owner)?.coin? '$'+chan(c.owner).coin : '',...reelHashtags(c)))
    .sort((a,b)=>stats(b.views,Date.now()-day).delta-stats(a.views,Date.now()-day).delta);
  const channels=exploreTab==='reels'?[]:s.channels.filter(c=>matches(c.name,'@'+handleFor(c),c.coin&&'$'+c.coin));
  const groups=[
    ['reels', q?'Videos':'Trending videos',reels.map(reel=>{
      const owner=chan(reel.owner);
      return '<article class="exploreRow">'+link('<strong>'+esc(reel.title)+'</strong><small>'+esc(owner?.name||'')+' · '+fmt(last(reel.views))+' views</small>','Clips/'+reel.id,'exploreTitle')+reelThumb(reel)+'</article>';
    })],
    ['channels','Channels',!show('channels')?[]:channels.map(c=>exploreProfileLink(c,c.name,fmt(followerTotal(c))+' followers','Profile/'+c.id))],
    ['traders','Traders',!show('traders')?[]:channels.filter(c=>s.closed.some(trade=>trade.owner===c.id)||c.id===myId()&&Object.keys(s.hold).length).map(c=>exploreProfileLink(c,c.name,'','Profile/'+c.id))],
    ['coins','Creator coins',!show('coins')?[]:channels.filter(c=>c.coin).map(c=>exploreProfileLink(c,'$'+c.coin,c.name,'Trading/'+c.id))],
    ['coins','Moment Coins',!show('coins')?[]:s.clips.flatMap(reel=>momentsFor(reel.id).filter(coin=>matches(coin.name,reel.title,coin.launcher)).map(coin=>
      '<div class="exploreRow">'+link(esc(coin.name)+'<small>'+esc(reel.title)+'</small>','Moment/'+encodeURIComponent(reel.id)+'/'+encodeURIComponent(coin.id||reel.id),'exploreTitle')+'</div>'))]
  ];
  const visible=groups.filter(([id,,rows])=>rows.length&&(exploreTab==='all'||exploreTab===id));
  const hashtags=!q&&exploreTab==='all'?'<section class="exploreHashtags"><h2>Trending hashtags</h2><div>'+
    trendingHashtags().map(({name,reels})=>btn(esc(name)+'<small>'+reels+' '+(reels===1?'video':'videos')+'</small>','hashtag:'+esc(name),'hashtag')).join('')+'</div></section>':'';
  const creators=!q&&exploreTab==='all'?trendingCreators():'';
  return creators+hashtags+(visible.length ? visible.map(([,title,rows])=>'<section><h2>'+title+'</h2>'+rows.slice(0,exploreLimit).join('')+(rows.length>exploreLimit?btn('Show more '+title.toLowerCase(),'moreExplore','subtle'):'')+'</section>').join('')
    : '<p class="emptyView">'+(q?'No results found.':'Nothing to explore here yet.')+'</p>');
}
function search(section){
  const showLeaderboard=section==='Leaderboard';
  const tabs=viewTabs('Explore categories',[
    ['all','For you'],['following','Following'],['reels','Videos'],['channels','Channels'],['traders','Traders'],['coins','Coins'],['leaderboard','Leaderboard']
  ],showLeaderboard?'leaderboard':exploreTab,'explore');
  const content=showLeaderboard?ranks():
    '<label class="exploreField"><span aria-hidden="true">⌕</span><input id="search" type="search" aria-label="Search Pulse" placeholder="Search videos, hashtags, channels, or coins" value="'+esc(query)+'"></label>'+
    '<div id="exploreResults">'+exploreResults()+'</div>';
  return '<div class="discovery"><h1>Explore</h1>'+tabs+content+'</div>';
}
const socialIcons={
  like:'M12 21S3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12Z',
  comments:'M21 11a8.5 8.5 0 0 1-8.5 8.5 10 10 0 0 1-3.5-.7L4 21l1.2-4.5A8.5 8.5 0 1 1 21 11Z M8 11h.1m4 0h.1m4 0h.1',
  save:'M6 3h12v18l-6-4-6 4z',
  report:'M5 21V4c4-4 10 3 14 0v10c-4 3-10-4-14 0',
  repost:'M4 10V6h15l-3-3 M20 14v4H5l3 3',
  share:'M12 15V3m-4 4 4-4 4 4 M5 11v9h14v-9'
};
const tradeSymbol='<span class="tradeSymbol" aria-hidden="true"></span>';
function reelIcon(kind){
  if(kind==='trade')return tradeSymbol;
  return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+socialIcons[kind]+'"/></svg>';
}
const demoStartedAt=Date.now();
const demoMoments={
  kimchi:{name:'Chopstick Crunch',description:'The chopsticks meet the bowl on the beat in Kimchi Crunch.',time:2.4,launcher:'Pim',offset:-260},
  bot:{name:'Tiny Bot Wave',description:'Tiny Bot lifts its arm for a tiny wave.',time:3.2,launcher:'Jay',offset:-78}
};
function momentsFor(reelId){
  const stored=s.moments?.[reelId];
  const value=stored||demoMoments[reelId],local=Array.isArray(value)?value:value?[value]:[];
  const remote=community.moments.filter(m=>m.clipId===reelId);
  const migrated=new Set(local.map(coin=>coin.publishId).filter(Boolean));
  return [...local.map(coin=>{
    const published=coin.publishId&&remote.find(m=>m.id===coin.publishId);
    return published?{...published,ledgerId:coin.id||reelId}:coin;
  }),...remote.filter(m=>!migrated.has(m.id))];
}
function momentFor(reelId,coinId){
  const coins=momentsFor(reelId);
  return coinId?coins.find(coin=>(coin.id||reelId)===coinId):coins[0];
}
function momentAction(action,reel,coin){
  return action+':'+esc(reel.id)+(coin?.id?':'+esc(coin.id):'');
}
function momentBadge(reel){
  const coins=momentsFor(reel.id);
  if(!coins.length)return '';
  const label=coins.length===1?esc(coins[0].name):coins.length+' Moment Coins';
  return btn(label,'reelMoment:'+esc(reel.id),'coinPill momentPill');
}
let demoElapsed=0;
const demoConversation=[
  ['1','Mina','That street looks completely different after dark.',-720],
  ['reaction','Jay','The face at 0:03 when the timer hits zero 😭',-510],
  ['2','Nara','That wave was worth the wait.',-410],
  ['kimchi','Pim','The chopsticks at the end make this so satisfying.',-320],
  ['3','June','That transition landed right on the beat.',-240],
  ['myth','Arun','The green glow when the mask appears is my favorite part.',-175],
  ['4','Mina','There is no such thing as too much cheese.',-105],
  ['bot','Jay','Tiny bot has better timing than me.',-42],
  ['kimchi','June','The color palette on this one is so good.',18],
  ['reaction','Pim','I had to replay the last second.',36],
  ['bot','Nara','The little wave at the end 👋',54]
].map(([reel,author,text,offset],index)=>({reel,author,text,offset,id:'demo-'+index,demo:true,time:demoStartedAt+offset*1000}));
const demoInbox={
  bot:{text:'Hey! What should Tiny Bot try in the next video?',offset:-180},
  kimchi:{text:'Thanks for watching Kimchi Crunch! What should we cook next?',offset:-900}
};
const demoShortLikes={reaction:326,kimchi:189,myth:172,bot:146};
function reelLikeCount(reel){
  return (demoShortLikes[reel.id]??reel.likes)+community.reactions.filter(r=>r.kind==='like'&&r.target===reel.id).length+Number(s.likes.includes(reel.id));
}
const shortNumber=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
function demoReel(id){return demoConversation.some(row=>row.reel===id);}
function minutesAgo(time){
  const seconds=Math.max(0,Math.floor((Date.now()-time)/1000));
  return seconds<60?'Just now':seconds<3600?Math.floor(seconds/60)+'m ago':Math.floor(seconds/3600)+'h ago';
}
function tickDemoActivity(){
  if(document.hidden)return;
  demoElapsed++;
  if(!demoConversation.some(row=>row.offset===demoElapsed))return;
  for(const {reel} of demoConversation.filter(row=>row.offset===demoElapsed))updateCommentCount(reel);
}
const demoTimer=setInterval(()=>{
  tickDemoActivity();
  if(demoElapsed>=54)clearInterval(demoTimer);
},1000);
function reelComments(id){
  const local=[...(s.comments?.[id]||[]),...community.comments.filter(c=>c.clip===id)];
  const samples=demoConversation.filter(row=>row.reel===id&&(row.offset<=demoElapsed||local.some(reply=>reply.reply===row.id)||s.demoCommentLikes?.includes(row.id)))
    .map(row=>({...row,liked:!!s.demoCommentLikes?.includes(row.id)}));
  return [...samples,...local];
}
function updateCommentCount(id){
  const counter=$('.reel[data-id="'+CSS.escape(id)+'"] [data-act^="comments:"] small');
  if(counter){counter.textContent=fmt(reelComments(id).length);counter.parentElement.setAttribute('aria-label','Comments · '+counter.textContent);}
}
function showComments(reel,replyId=''){
  if(!reel)return;
  const comments=reelComments(reel.id),reply=comments.find(item=>item.id===replyId);
  const entry=comment=>'<article class="socialComment'+(comment.reply?' reply':'')+'"><span class="socialAvatar">'+esc(comment.author[0])+'</span><div><strong>'+esc(comment.author)+'</strong>'+(comment.demo?'<small class="commentTime">'+minutesAgo(comment.time)+' · Demo</small>':'')+'<p>'+esc(comment.text)+'</p>'+
    (!comment.reply?btn('Reply','reply:'+reel.id+':'+comment.id,'subtle'):'')+'</div>'+
    '<button type="button" class="subtle commentHeart" aria-label="Like comment" aria-pressed="'+!!comment.liked+'" data-act="commentLike:'+esc(reel.id)+':'+esc(comment.id)+'">'+reelIcon('like')+'</button></article>';
  const rows=comments.filter(item=>!item.reply).map(item=>entry(item)+comments.filter(child=>child.reply===item.id).map(entry).join('')).join('');
  modal('<section class="commentsSheet"><h2>Comments <small>'+comments.length+'</small></h2>'+
    '<div class="commentList">'+(rows||'<p class="emptyView">No comments yet. Start the conversation.</p>')+'</div>'+
    (reply?'<p class="replyTo">Replying to '+esc(reply.author)+' '+btn('Cancel','comments:'+reel.id,'subtle')+'</p>':'')+
    '<form id="reelComment" data-reel="'+esc(reel.id)+'" data-reply="'+esc(replyId)+'" class="socialComposer"><input name="text" aria-label="Write a comment" placeholder="Write a comment…" maxlength="400" required><button class="primary">Post</button></form></section>');
  if(reply)$('#reelComment input').focus();
}
function reelLink(reel){
  const url=new URL(location.href);
  url.hash='Clips/'+encodeURIComponent(reel.id);
  return url.href;
}
function reportReel(reel){
  if(!reel)return;
  if(s.reports?.[reel.id])return toast('Report already saved on this device.');
  modal('<h2>Report video</h2><form id="reelReport" data-reel="'+esc(reel.id)+'"><label>Reason<select name="reason" required><option value="">Choose a reason</option><option>Spam</option><option>Harassment</option><option>Other</option></select></label><p class="muted">'+(shared?'Reports are sent to the demo moderators.':'Offline demo reports stay on this device.')+'</p><button class="primary">Save report</button></form>');
}
function inbox(id){
  const contacts=s.channels.filter(c=>c.id!==myId()),person=contacts.find(c=>c.id===id);
  const messages=contact=>{
    const sample=demoInbox[contact.id];
    const remote=community.messages.filter(m=>m.actor===contact.id||m.recipient===contact.id)
      .map(m=>({text:m.body,time:Date.parse(m.created_at),incoming:m.actor!==myId()}));
    const history=[...(s.messages?.[contact.id]||[]),...remote].sort((a,b)=>a.time-b.time);
    if(!sample)return history;
    const time=Math.min(demoStartedAt+sample.offset*1000,(history[0]?.time??Infinity)-1000);
    return [{text:sample.text,time,incoming:true},...history];
  };
  if(!person){
    const people=contacts.filter(c=>messages(c).length).sort((a,b)=>messages(b).at(-1).time-messages(a).at(-1).time);
    return '<section class="inboxPage"><h1>Inbox</h1>'+link('Find a channel to message','Search')+
      '<div class="inboxPeople">'+(people.map(c=>link(profileAvatar(c,'socialAvatar')+
        '<span><strong>'+esc(c.name)+'</strong><small>'+esc(messages(c).at(-1).text)+'</small></span>','Inbox/'+c.id,'inboxPerson')).join('')||'<p>No conversations yet.</p>')+'</div></section>';
  }
  const rows=messages(person).map(m=>{
    const date=Number.isFinite(m.time)?chatDate.format(m.time):'';
    return '<p class="chatBubble '+(m.incoming?'incoming':'outgoing')+'" data-chat-date="'+esc(date)+'">'+
      '<span class="chatSrOnly">'+(m.incoming?esc(person.name):'You')+': </span>'+esc(m.text)+'</p>';
  }).join('');
  return '<section class="inboxPage inboxConversation"><div class="inboxTop">'+
    '<a class="chatBack" href="#Inbox" aria-label="Back to Inbox">‹</a>'+profileAvatar(person,'socialAvatar')+
    '<div><h1>'+esc(person.name)+'</h1><small>'+(person.shared?'Private conversation':'Demo chat · This device')+'</small></div></div>'+
    '<div class="chatHistory"><div class="chatDate" hidden></div>'+
    '<div class="inboxThread" tabindex="0" role="log" aria-label="Conversation with '+esc(person.name)+'"><div class="chatMessages">'+
    (rows||'<p class="chatEmpty">Start a conversation.</p>')+'</div></div></div>'+
    '<form id="inboxMessage" class="socialComposer" data-person="'+esc(person.id)+'"><input name="text" aria-label="Message" placeholder="Write a message…" maxlength="500" required>'+
    '<button class="primary chatSend" aria-label="Send message"><span aria-hidden="true">➤</span></button></form></section>';
}
const chatDate=new Intl.DateTimeFormat('en-US',{dateStyle:'long'});
function atChatBottom(thread){
  return thread.scrollHeight-thread.clientHeight-thread.scrollTop<=8;
}
function mountChatHistory(previousTop){
  const thread=$('.inboxThread');
  if(!thread)return;
  const date=$('.chatDate');
  const messages=[...thread.querySelectorAll('.chatBubble')];
  const updateDate=()=>{
    if(atChatBottom(thread)){date.hidden=true;return;}
    const top=thread.getBoundingClientRect().top;
    const message=messages.find(item=>item.getBoundingClientRect().bottom>top);
    const label=message?.dataset.chatDate;
    date.hidden=!label;
    if(label&&date.textContent!==label)date.textContent=label;
  };
  thread.scrollTop=previousTop??thread.scrollHeight;
  thread.addEventListener('scroll',updateDate,{passive:true});
  updateDate();
}
function requireCommunityAccount(){
  if(!shared||window.pulseWallet.signed())return true;
  $('dialog')?.close();go('Login/profile');toast('Sign in to share with other users.');return false;
}
function formError(form,message){
  let note=form.querySelector('.formError');
  if(!note){note=document.createElement('p');note.className='formError';note.setAttribute('role','alert');form.append(note);}
  note.textContent=message;
}
async function refreshCommunity(){
  if(!shared)return false;
  const version=++communitySerial,viewer=myId();
  const data=await shared.community();
  if(viewer!==myId()||version!==communitySerial)return false;
  const moments=data.moments.map(m=>({id:m.id,clipId:m.clip,name:m.name,time:Number(m.frame_time),description:m.description,frame:m.frame,
    launcher:chan(m.actor)?.name||'Pulse member',createdAt:Date.parse(m.created_at),published:true}));
  const comments=data.comments.map(c=>({id:c.id,clip:c.clip,reply:c.reply,author:chan(c.actor)?.name||'Pulse member',text:c.body,
    liked:s.demoCommentLikes.includes(c.id),time:Date.parse(c.created_at)})).sort((a,b)=>a.time-b.time);
  const next={moments,comments,reactions:data.reactions,messages:data.messages.filter(m=>viewer!=='me'&&(m.actor===viewer||m.recipient===viewer))};
  const changed=!communityReady||JSON.stringify(community)!==JSON.stringify(next);
  communityReady=true;communityFailed=false;
  community=next;return changed;
}
async function sendSocial(form,data){
  if(!requireCommunityAccount())return;
  const viewer=myId(),button=form.querySelector('button.primary');
  if(button.disabled)return;
  button.disabled=true;
  try{
    const text=String(data.get('text')||'').trim(), reel=form.dataset.reel;
    if(form.id==='inboxMessage'&&!self())throw Error('Create your channel in Profile to send a message.');
    const signature=JSON.stringify([text,data.get('reason'),form.dataset.reply]);
    if(form.dataset.signature!==signature){form.dataset.request=crypto.randomUUID();form.dataset.signature=signature;}
    if(form.id==='reelReport'){
      await shared.post('reports',{clip:reel,reason:data.get('reason')});
      if(viewer===myId()){$('dialog').close();toast('Report sent to the demo moderators.');}
      return;
    }
    if(!text)throw Error('Enter a message.');
    if(form.id==='reelComment')await shared.post('comments',{id:form.dataset.request,clip:reel,body:text,reply:form.dataset.reply||null});
    else await shared.post('messages',{id:form.dataset.request,recipient:form.dataset.person,body:text});
    if(viewer!==myId())return;
    await refreshCommunity();
    if(!form.isConnected)return;
    if(reel){showComments(clip(reel));updateCommentCount(reel);}
    else {form.reset();render({latestChat:true});$('#inboxMessage input')?.focus();}
  }catch(e){formError(form,e.message||'Could not send. Try again.');}
  finally{button.disabled=false;}
}
function submitSocial(form,data){
  if(shared && (form.id!=='inboxMessage'||chan(form.dataset.person)?.shared))return sendSocial(form,data);
  const text=String(data.get('text')||'').trim();
  if(form.id==='reelComment'){
    const reel=clip(form.dataset.reel);
    if(!reel||!text)return;
    const comments=(s.comments??={})[reel.id]??=[];
    comments.push({id:crypto.randomUUID(),author:self()?.name||'You',text,reply:reelComments(reel.id).some(row=>row.id===form.dataset.reply&&!row.reply)?form.dataset.reply:''});
    save();showComments(reel);
    updateCommentCount(reel.id);
  }else if(form.id==='reelReport'){
    const reel=clip(form.dataset.reel),reason=data.get('reason');
    if(!reel||!['Spam','Harassment','Other'].includes(reason))return;
    (s.reports??={})[reel.id]??=reason;
    save();$('dialog').close();toast('Report saved on this device.');
  }else if(form.id==='inboxMessage'){
    const person=chan(form.dataset.person);
    if(!person||person.id===myId()||!text)return;
    ((s.messages??={})[person.id]??=[]).push({text,time:Date.now()});
    save();render({latestChat:true});$('#inboxMessage input').focus();
  }
}
function reelActions(c){
  function control(label,icon,act,{pressed=null,count=null,showLabel=false,compact=false}={}){
    const state=pressed===null?'':' aria-pressed="'+pressed+'"';
    return '<button type="button" class="railAction '+(showLabel?'reelTrade':'reelIconAction')+'" data-act="'+esc(act)+'" aria-label="'+label+(count===null?'':' · '+fmt(count))+'" title="'+label+'"'+state+'>'+
      reelIcon(icon)+(showLabel?label:'')+(count===null?'':'<small>'+(compact?shortNumber.format(count):fmt(count))+'</small>')+'</button>';
  }
  const actions=[];
  actions.push(control('Trade','trade','reelTrade:'+c.id,{showLabel:true}));
  actions.push(control('Like','like','toggle:likes:'+c.id,{pressed:s.likes.includes(c.id)||community.reactions.some(r=>r.actor===myId()&&r.kind==='like'&&r.target===c.id),count:reelLikeCount(c),compact:true}));
  actions.push(control('Comments','comments','comments:'+c.id,{count:reelComments(c.id).length}));
  actions.push(control('Save','save','toggle:saves:'+c.id,{pressed:s.saves.includes(c.id)}));
  actions.push(control('Repost','repost','toggle:reposts:'+c.id,{pressed:s.reposts.includes(c.id)}));
  actions.push(control('Share','share','reelShare:'+c.id));
  actions.push(control('Report','report','reelReport:'+c.id));
  return '<div class="reelRail" role="group" aria-label="Video actions">'+actions.join('')+'</div>';
}
function feedItems(id){
  return s.clips.filter(reel=>reel.id===id||!pausedReelIds.has(reel.id));
}
function feed(id){
  if(id&&!clip(id))return missingResource('video','Clips');
  const visible=feedItems(id);
  const idx=Math.max(0,visible.findIndex(c=>c.id===id));
  const items=[...visible.slice(idx),...visible.slice(0,idx)];
  return '<div class="feed" aria-label="Video feed">'+items.map(c=>{
    const ch=chan(c.owner),seeded=Boolean(punchlines[Number(c.id)-1])&&c.owner===c.id;
    const media=c.media?'crossorigin="anonymous" src="'+esc(c.media)+'"':c.owner==='me'?'src="'+(urls[c.id]||'')+'"':'poster="media/'+c.id+'.jpg" src="media/'+c.id+'.mp4"';
    const backdrop=seeded?' style="--reel-poster:url(media/'+c.id+'.jpg)"':'';
    const caption=seeded?'<div class="memeCaption"><strong>'+esc(c.title)+'</strong><strong>'+esc(punchlines[Number(c.id)-1])+'</strong></div>':'';
    const hashtags=reelHashtags(c).map(tag=>btn(esc(tag),'hashtag:'+esc(tag),'reelHashtag')).join('');
    const coin=ch.coin?link('$'+esc(ch.coin),'Trading/'+ch.id,'coinPill'):'';
    return '<article class="reel" data-id="'+c.id+'"'+backdrop+'><template class="reelMedia"><video playsinline muted controls preload="metadata" '+media+'></video></template>'+caption+
      '<button type="button" class="momentGesture" aria-label="Hold to create Moment Coin" title="Hold to create Moment Coin"></button>'+
      '<button type="button" class="reelSound" data-act="reelSound:'+esc(c.id)+'" aria-label="Video sound" aria-pressed="false">Sound off</button>'+
      '<div class="controls"><div class="byline">'+link(esc(ch.name),'Profile/'+ch.id)+coin+momentBadge(c)+'</div><h3>'+esc(c.title)+'</h3>'+(demoReel(c.id)?'<span class="demoLabel">Demo activity</span>':'')+(hashtags?'<div class="reelHashtags">'+hashtags+'</div>':'')+'</div>'+reelActions(c)+'</article>';
  }).join('')+'</div>';
}
const reelVisibility=.65;
let activeReelWatch, feedRoute, reelAudioEnabled=false;
function updateSoundButton(article,video){
  const button=article.querySelector('.reelSound');
  const audible=!video.muted&&video.volume>0;
  button.setAttribute('aria-pressed',String(audible));
  button.textContent=audible?'Sound on':'Sound off';
}
function applySharedViews(views,count,authoritative=false){
  if(count==null)return false;
  const total=Number(count);
  if(!Number.isSafeInteger(total)||total<0||(views.length&&(total===last(views)||!authoritative&&total<last(views))))return false;
  views.push([Date.now(),total]);
  return true;
}
function recordReelView(reel){
  if(!reel||reel.owner===myId())return;
  if(reel.shared){
    const playback=crypto.randomUUID(), viewer=myId();
    async function record(){
      for(let attempt=0;attempt<3&&viewer===myId();attempt++){
        try{
          const count=await shared.recordView(reel.id,playback);
          const current=clip(reel.id);
          if(current)applySharedViews(current.views,count);
          return;
        }catch{if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));}
      }
    }
    record();
    return;
  }
  reel.views.push([Date.now(),last(reel.views)+1]);
  save();
}
function observe(previous){
  observer?.disconnect();
  activeReelWatch=null;
  const root=$('.feed');
  if(!root)return;
  const watches=new Map();
  function mount(article){
    const id=article.dataset.id, video=article.querySelector('template').content.firstElementChild.cloneNode(true);
    article.prepend(video);
    video.muted=!reelAudioEnabled;
    updateSoundButton(article,video);
    video.addEventListener('volumechange',()=>updateSoundButton(article,video));
    const reel=clip(id);
    if(reel?.captions){const track=document.createElement('track');track.kind='captions';track.label='Captions';track.srclang='und';
      track.src=URL.createObjectURL(new Blob([reel.captions],{type:'text/vtt'}));video.append(track);}
    const restored=previous?.id===id?previous:null;
    const watch={id,video,visible:false,counted:restored?.counted||false,position:0};
    if(restored?.position>0)video.addEventListener('loadedmetadata',()=>{
      if(restored.position<video.duration)video.currentTime=restored.position;
    },{once:true});
    function countPlayback(){
      if(!video.isConnected||!watch.visible||document.hidden||video.paused||watch.counted)return;
      watch.counted=true;
      recordReelView(clip(id));
    }
    watch.play=()=>video.play().then(countPlayback).catch(()=>{
      if(!video.isConnected||!watch.visible||video.muted)return;
      video.muted=true;
      return video.play().then(countPlayback).catch(()=>{});
    });
    video.addEventListener('playing',countPlayback);
    video.addEventListener('timeupdate',()=>{
      if(video.seeking)return;
      watch.position=video.currentTime;
      if(watch.restarted&&watch.position>0){watch.restarted=false;countPlayback();}
    });
    video.addEventListener('seeking',()=>{
      if(watch.visible&&watch.counted&&watch.position>.05&&video.currentTime<=.01){
        watch.counted=false;
        watch.restarted=true;
      }
    });
    video.addEventListener('ended',()=>{
      watch.counted=false;
      watch.position=0;
      if(watch.visible&&!document.hidden)watch.play();
    });
    return watch;
  }
  if(previous){const node=root.querySelector('[data-id="'+CSS.escape(previous.id)+'"]');if(node)root.scrollTop=node.offsetTop-root.firstElementChild.offsetTop;}
  observer=new IntersectionObserver(entries=>{
    if(!root.isConnected)return;
    for(const entry of entries){
      let watch=watches.get(entry.target);
      const visible=entry.intersectionRatio>=reelVisibility;
      if(!watch&&!visible)continue;
      if(!watch){watch=mount(entry.target);watches.set(entry.target,watch);}
      if(watch.visible===visible)continue;
      watch.visible=visible;
      if(visible){
        activeReelWatch=watch;
        watch.resumeOnShow=document.hidden;
        if(!document.hidden)watch.play();
      }else{
        if(activeReelWatch===watch)activeReelWatch=null;
        watch.video.pause();
        watch.counted=false;
        for(const track of watch.video.querySelectorAll('track'))URL.revokeObjectURL(track.src);
        watch.video.remove();watches.delete(entry.target);
      }
    }
  },{root,threshold:reelVisibility});
  for(const article of root.querySelectorAll('.reel'))observer.observe(article);
}
document.addEventListener('visibilitychange',()=>{
  const watch=activeReelWatch;
  if(!watch)return;
  if(document.hidden){
    watch.resumeOnShow=!watch.video.paused;
    watch.video.pause();
  }else if(watch.resumeOnShow&&!$('dialog').open){
    watch.resumeOnShow=false;
    watch.play();
  }
});
let marketGroup='creators';
const marketWindows={'1m':60000,'5m':300000,'30m':1800000,'1h':3600000,'24h':86400000};
let marketRange='1h',useTestnetFills=false,marketPaintedAt=0;
const marketDemoUsdRate=600;
const marketUsdFormatter=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:6});
function marketUsd(amount){
  const usd=Number(amount)*marketDemoUsdRate;
  return usd>0&&usd<0.000001?'<span title="Less than one millionth of a dollar">&lt;$0.000001</span>':marketUsdFormatter.format(usd);
}
const sampleTradeActors=['Mina','Jay','Nara','Pim','June','Arun'];
const sampleTradeMarkets=[
  {id:'1',type:'creator',lot:6800,delay:14},
  {id:'2',type:'creator',lot:4600,delay:9},
  {id:'3',type:'creator',lot:3900,delay:2},
  {id:'4',type:'creator',lot:2800,delay:26},
  {id:'kimchi',type:'moment',lot:18500,delay:4},
  {id:'bot',type:'moment',lot:24000,delay:18}
];
function isSampleMoment(id,coin){
  const example=demoMoments[id];
  return Boolean(example&&coin&&!coin.id&&coin.name===example.name&&coin.offset===example.offset);
}
function sampleTrades(scope,now,range=marketRange,limit=4){
  let markets=sampleTradeMarkets;
  if(scope.startsWith('creator-')&&!markets.some(m=>m.type==='creator'&&'creator-'+m.id===scope)){
    const id=scope.slice(8),seed=demoMetricSeed(id);
    markets=[...markets,{id,type:'creator',lot:3200+seed*150,delay:seed%12}];
  }
  return markets.flatMap(({id,type,lot,delay},index)=>{
    const coin=type==='moment'?demoMoments[id]:chan(id);
    if(type==='moment' ? !momentsFor(id).some(moment=>isSampleMoment(id,moment)) : !coin?.coin) return [];
    const key=type==='moment'?'moment-'+id:'creator-'+id;
    const onWatchlist=s.watchlist?.includes(type==='moment'?'moment-'+id:id);
    if(scope==='creators' ? type!=='creator' : scope==='moments' ? type!=='moment' :
      scope==='saved' ? !onWatchlist : scope!==key) return [];
    const interval=(12+index*2)*1000;
    // A fixed clock keeps demo fills consistent across reloads and tabs.
    const start=delay*1000;
    const latest=Math.floor((now-start)/interval);
    const firstSlot=Math.ceil((now-marketWindows[range]-start)/interval);
    const openingSupply=35000+index*8500;
    return Array.from({length:Math.min(limit,latest-firstSlot+1)},(_,offset)=>{
      const slot=latest-offset;
      const sequence=slot+(type==='creator'?index:0);
      const phase=((sequence%4)+4)%4;
      const cycle=Math.floor(sequence/4);
      const first=Math.round((lot+((Math.abs(cycle)+index)%5)*lot/8)/100)*100;
      const second=Math.round(first*.6/100)*100;
      // Two fictional wallets build positions, then sell their respective lots.
      const [from,to]=[[0,first],[first,first+second],[first+second,second],[second,0]][phase];
      const before=openingSupply+from,after=openingSupply+to;
      const side=after>before?'buy':'sell';
      const quantity=Math.abs(after-before);
      const actor=sampleTradeActors[((cycle+phase%2+index)%6+6)%6];
      const curve=type==='moment'?momentCurve:demoCreatorCurve;
      const amount=curve.reserve(Math.max(before,after))-curve.reserve(Math.min(before,after));
      return {name:type==='moment'?coin.name:'$'+coin.coin,actor,side,quantity,amount:String(amount),
        time:start+slot*interval,sold:after,marketCap:curveMarketCap(after,curve)};
    });
  }).sort((a,b)=>b.time-a.time).slice(0,limit);
}
setInterval(()=>{
  if(document.hidden||$('dialog')?.open)return;
  const rows=document.querySelectorAll('[data-sample-stats]');
  if(!rows.length)return;
  const now=marketPaintedAt=Date.now();
  for(const row of rows){
    const stats=sampleMarketStats(row.dataset.sampleStats,now);
    if(row.innerHTML!==stats)row.innerHTML=stats;
  }
},5000);
function marketBadge(label,value,explanation){
  return '<span class="marketBadge" title="'+esc(explanation)+'"><span>'+label+'</span> <b>'+value+'</b></span>';
}
function demoMetricSeed(key){
  return Array.from(key).reduce((hash,char)=>(hash*31+char.codePointAt(0))%23,7);
}
function demoMarketMetrics(key,position,curve){
  const seed=demoMetricSeed(key);
  return {liquidity:momentBNB(80000000000000n+BigInt(seed)*20000000000000n+2n*curve.reserve(position.sold)),
    holders:88+seed*31+Number(position.owned>0),top10:(12+seed*.7).toFixed(1)+'%',
    audit:{dev:(1.5+seed*.16).toFixed(1)+'%',snipers:(seed*.07).toFixed(1)+'%',insiders:(seed*.11).toFixed(1)+'%',
      bundlers:(seed*.04).toFixed(1)+'%',blueChip:(3+seed*.54).toFixed(1)+'%',burned:seed%2?'100%':'0%',
      paid:seed%2?'Paid':'Unpaid',security:'Sample pass'}};
}
function marketAudit(holders,top10,audit){
  const unavailable='Unavailable for this market';
  return '<div class="marketAudit" aria-label="Holder and audit metrics">'+[
    ['Top 10',top10,'Share of circulating coins held by the ten largest wallets'],
    ['Dev holdings',audit?.dev,unavailable],['Snipers',audit?.snipers,unavailable],
    ['Insiders',audit?.insiders,unavailable],['Bundlers',audit?.bundlers,unavailable],
    ['Holders',holders,'Wallets holding circulating coins'],
    ['Blue-chip holders',audit?.blueChip,unavailable],['LP burned',audit?.burned,'No DEX pool'],
    ['DEX paid',audit?.paid,'DEXScreener payment status unavailable'],['Security',audit?.security,'No token safety rating available']
  ].map(([label,value,description])=>marketBadge(label,value??'—',audit?'Illustrative demo data':description)).join('')+'</div>';
}
function marketAge(timestamp){
  if(!timestamp)return '—';
  const minutes=Math.floor(Math.max(0,Date.now()-timestamp)/60000);
  if(minutes<1)return '<1m';
  if(minutes<60)return minutes+'m';
  if(minutes<1440)return Math.floor(minutes/60)+'h';
  return Math.floor(minutes/1440)+'d';
}
function marketStats({marketCap,holders,top10,fills,format,historyStart,liquidity,audit},now=Date.now(),range=marketRange){
  const since=now-marketWindows[range];
  const periodFills=fills.filter(fill=>fill.time>=since&&fill.time<=now);
  const caps=periodFills.filter(fill=>fill.marketCap!=null).map(fill=>({time:fill.time,value:Number(fill.marketCap)}));
  const prices=caps.map(point=>point.value);
  const first=prices[0], lastPrice=prices.at(-1);
  const change=prices.length>1&&first>0?(lastPrice-first)/first*100:null;
  const tone=change===null?'':change<0?'negative':'positive';
  const partial=historyStart!=null&&historyStart>since;
  let chart='<small>'+(periodFills.length?'No market cap history':partial?'No fills in available history':'No fills in '+range)+'</small>';
  if(prices.length){
    const low=Math.min(...prices), span=Math.max(...prices)-low;
    const points=Array.from({length:Math.min(prices.length,80)},(_,i)=>{
      const index=Math.floor(i*(prices.length-1)/Math.max(1,Math.min(prices.length,80)-1));
      const x=2+96*(caps[index].time-since)/marketWindows[range];
      return [x.toFixed(2),span?(30-28*(prices[index]-low)/span).toFixed(2):16];
    });
    const drawing=points.length===1?'<circle cx="'+points[0][0]+'" cy="16" r="2.2"/>':
      '<polygon points="'+points[0][0]+',32 '+points.join(' ')+' '+points.at(-1)[0]+',32"/><polyline points="'+points.join(' ')+'"/>';
    chart='<svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="Market cap chart · '+range+'">'+drawing+'</svg>';
  }
  const stat=(label,value)=>'<span class="marketStat"><small>'+label+'</small><b>'+value+'</b></span>';
  const volume=format(periodFills.reduce((sum,fill)=>sum+BigInt(fill.amount),0n));
  const buys=periodFills.filter(fill=>fill.side==='buy').length;
  const changeLabel=change===null?'':'<small class="'+tone+'" title="Market cap change from first to latest trade">'+
    (change>0?'+':'')+change.toFixed(2)+'%</small>';
  return '<div class="marketNumbers"><span class="marketSpark '+tone+'">'+chart+'</span>'+
    '<div class="marketCap">'+stat('Market cap',marketCap==null?'—':marketUsd(marketCap))+changeLabel+'</div>'+
    stat('Liquidity',liquidity==null?'<span title="No DEX pool">—</span>':'<span title="Illustrative demo liquidity">'+marketUsd(liquidity)+'</span>')+stat('Volume',marketUsd(volume))+
    stat('TXNs',fmt(periodFills.length)+' <small><span class="positive" title="Buys">'+fmt(buys)+' B</span> / <span class="negative" title="Sells">'+fmt(periodFills.length-buys)+' S</span></small>')+
    '</div>'+marketAudit(holders,top10,audit)+(partial?'<small class="marketDataStatus">Partial window · last 1,000 Testnet blocks</small>':'');
}
function sampleMarketStats(scope,now){
  const market=scope.startsWith('creator-')?scope:scope.slice(7);
  const curve=scope.startsWith('creator-')?demoCreatorCurve:momentCurve;
  const position=demoTradePosition(momentLedger(),market,scope,now);
  return marketStats({...demoMarketMetrics(market,position,curve),marketCap:curveMarketCap(position.sold,curve),
    fills:demoMarketHistory(position,scope,now,marketRange,curve),format:momentBNB},now);
}
function marketRow({name,detail,art,key,action,stats,creatorId,sampleScope,age,views}){
  const saved=s.watchlist?.includes(key);
  return '<article class="marketRow"><div class="marketIdentity"><span class="assetArt" aria-hidden="true" style="'+art+'">'+(art?'':esc(name[0]))+'</span>'+
    '<div class="assetName"><strong>'+esc(name)+'</strong>'+(sampleScope?' <span class="demoLabel">Demo</span>':'')+'<small>'+detail+'</small><small class="marketIdentityStats">'+
    marketBadge('Age',esc(marketAge(age)),'Time since launch')+marketBadge('Views',fmt(views),'Source video views')+
    marketBadge('Fee','0%','Pulse protocol fee')+'</small></div></div>'+
    '<div class="marketStats"'+(creatorId?' data-creator-stats="'+esc(creatorId)+'"':'')+(sampleScope?' data-sample-stats="'+esc(sampleScope)+'"':'')+'>'+stats+'</div>'+
    '<div class="marketActions">'+action+'<button class="star" data-act="watch:'+esc(key)+'" aria-pressed="'+!!saved+
    '" aria-label="Watchlist: '+esc(name)+'">'+(saved?'★':'☆')+'</button></div></article>';
}
function shareMomentButton(coin,reel){
  return shared&&coin&&!coin.published&&!community.moments.some(m=>m.id===coin.publishId)&&s.moments?.[reel.id]?btn('Publish to shared market',momentAction('publishMoment',reel,coin),'subtle'):'';
}
async function publishSavedMoment(reel,coin,button){
  if(!coin||coin.published||button.disabled||!requireCommunityAccount())return;
  button.disabled=true;
  try{
    let frame=coin.frame;
    if(!frame){
      const canvas=$('.momentCrop'), video=$('.momentPreview');
      if(!video||video.readyState<2||video.seeking)throw Error('Wait for the frame to load.');
      if(canvas)frame=canvas.toDataURL('image/jpeg',.74);
      else {const output=document.createElement('canvas');output.width=output.height=512;momentCrop(video,output,coin.crop).redraw();frame=output.toDataURL('image/jpeg',.74);}
    }
    coin.publishId ||= crypto.randomUUID();save();
    await shared.post('moments',{id:coin.publishId,clip:reel.id,name:coin.name,description:coin.description,frame_time:coin.time,frame});
    await refreshCommunity();
    const published=momentFor(reel.id,coin.publishId);
    if(published&&button.isConnected)openMoment(reel,null,published);
  }catch(error){formError(button.parentElement,error.message||'Could not publish this frame.');}
  finally{button.disabled=false;}
}
function frameArt(coin,reel){return /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(coin.frame||'')?'background-image:url('+coin.frame+')':image(reel);}
function momentCreatedAt(coin){
  return coin.createdAt??(coin.offset==null?null:demoStartedAt+coin.offset*1000);
}
function momentMarketCap(position){
  return curveMarketCap(position.sold,momentCurve);
}
function momentMarket(now){
  const moments=s.clips.flatMap(reel=>momentsFor(reel.id).map(coin=>({reel,coin,id:coin.id||reel.id})))
    .filter(({id})=>marketGroup!=='saved'||s.watchlist?.includes('moment-'+id));
  if(!moments.length)return '';
  const ledger=momentLedger();
  return '<section class="momentMarket"><h2>Moment Coins <span class="demoLabel">Demo</span></h2><p class="marketScope">Liquidity and holder metrics are illustrative. Trades you confirm here are saved in this browser.</p>'+
    moments.map(({reel,coin,id})=>{
      const position=momentPosition(ledger,coin.ledgerId||id);
      const sampleScope=isSampleMoment(reel.id,coin)?'moment-'+reel.id:null;
      return marketRow({
        name:coin.name,detail:esc(reel.title)+' · '+momentTime(coin.time)+' · '+esc(coin.launcher||'You'),
        art:frameArt(coin,reel),key:'moment-'+id,views:last(reel.views),
        age:momentCreatedAt(coin)??(epoch-(2+demoMetricSeed(id))*3600000),action:btn('Trade',momentAction('tradeMoment',reel,coin),'marketTrade'),
        sampleScope,stats:sampleScope?sampleMarketStats(sampleScope,now):marketStats({marketCap:momentMarketCap(position),
          ...demoMarketMetrics(id,position,momentCurve),
          fills:demoMarketHistory(position,null,now,marketRange,momentCurve),format:momentBNB},now)
      });
    }).join('')+'</section>';
}
function marketHome(){
  const now=marketPaintedAt=Date.now();
  const visible=marketGroup==='moments'?[]:s.channels.filter(c=>c.coin&&(marketGroup!=='saved'||s.watchlist?.includes(c.id)));
  const moments=marketGroup==='creators'?'':momentMarket(now);
  const canSwitch=visible.length>0;
  const timeControls=viewTabs('Market timeframe',Object.keys(marketWindows).map(key=>[key,key]),marketRange,'marketTime');
  const sourceControls=canSwitch?viewTabs('Creator coin activity source',
    [['demo','Demo activity'],['testnet','Testnet fills']],useTestnetFills?'testnet':'demo','marketSource'):'';
  return '<div class="marketHome"><div class="balanceBlock"><div><small>BSC TESTNET · CHAIN 97</small><h1>Coin markets</h1><p>Market values use a demo rate of '+marketUsd(1)+' per tBNB.</p></div></div>'+
    '<div class="marketTabs" role="group" aria-label="Coin markets">'+
    [['creators','Creator Coins'],['moments','Moment Coins'],['saved','Watchlist']].map(([key,label])=>
      '<button type="button" class="'+(key===marketGroup?'selected':'')+'" data-act="group:'+key+
      '" aria-pressed="'+(key===marketGroup)+'">'+label+'</button>').join('')+'</div>'+
    '<div class="marketControls">'+timeControls+sourceControls+'</div>'+
    (visible.length?'<h2>Creator Coins</h2><p class="marketScope">'+(canSwitch&&!useTestnetFills?
      'Demo markets use simulated trades, liquidity, and holder metrics.':
      'BSC Testnet trade history covers up to 1,000 recent blocks.')+' Market cap uses circulating coins.</p>'+
      visible.map(c=>{
        const sampleScope=!useTestnetFills?'creator-'+c.id:null;
        return marketRow({
        name:'$'+c.coin,detail:esc(c.name),art:c.shared||c.id==='me'?'':'background-image:url(media/'+encodeURIComponent(c.id)+'.jpg)',
        key:c.id,age:sampleScope?epoch-(5+demoMetricSeed(c.id))*3600000:null,
        views:s.clips.filter(reel=>reel.owner===c.id).reduce((total,reel)=>total+last(reel.views),0),
        action:sampleScope?btn('Trade','demoCreatorTrade:'+esc(c.id),'marketTrade'):link('Trade','Trading/'+c.id,'marketTrade'),
        creatorId:sampleScope?null:c.id,sampleScope,
        stats:sampleScope?sampleMarketStats(sampleScope,now):'<small class="marketDataStatus">Loading market data…</small>'
        });
      }).join(''):'')+
    (!visible.length&&!moments?'<p class="emptyMarket">'+(marketGroup==='saved'?'Star a coin to add it to your watchlist.':'No coins available.')+'</p>':'')+moments+'</div>';
}
let creatorMarketSnapshot;
async function paintMarketRows(){
  const rows=[...document.querySelectorAll('[data-creator-stats]')];
  if(!rows.length)return;
  const creators=rows.map(row=>chan(row.dataset.creatorStats));
  const key=JSON.stringify(creators.map(creator=>[creator.id,creator.walletId]));
  if(creatorMarketSnapshot?.key!==key||Date.now()-creatorMarketSnapshot.time>=15000){
    creatorMarketSnapshot={key,time:Date.now(),request:window.pulseWallet.marketSnapshot(creators)};
  }
  let snapshot;
  try{snapshot=await creatorMarketSnapshot.request;}
  catch{snapshot=new Map();}
  for(const row of rows){
    if(!row.isConnected)continue;
    const data=snapshot.get(row.dataset.creatorStats);
    if(data&&!data.status)row.innerHTML=marketStats(data,data.asOf);
    else{
      const message=document.createElement('small');
      message.className='marketDataStatus';
      message.textContent=data?.status||'Market data unavailable';
      row.replaceChildren(message);
    }
  }
}
function missingResource(type,home){
  if(shared&&sharedProfileStatus==='loading')return '<p role="status">Loading '+type+'…</p>';
  if(shared&&sharedProfileStatus==='failed')return '<p role="alert">Could not load this '+type+'.</p>'+btn('Retry','retrySharedProfile');
  return '<h1>'+type[0].toUpperCase()+type.slice(1)+' not found</h1>'+link('Browse '+(type==='video'?'videos':'markets'),home);
}
function trade(id){
  if(!id)return marketHome();
  const c=s.channels.find(x=>x.coin&&x.id===id);
  if(!c)return missingResource('market','Trading');
  return heading('Trading','BSC Testnet · tBNB',link('All markets','Trading',''))+
    '<div class="layout"><section class="panel"><h2>'+esc(c.name)+'</h2>'+link('View profile','Profile/'+c.id)+'<p>Channel coin $'+esc(c.coin)+'</p></section><section class="panel chainPanel" id="chainPanel"></section></div>'+
    '<h2 class="sectionhead">Latest videos</h2>'+cards(newest(s.clips.filter(x=>x.owner===c.id)));
}
function momentHoldings(){
  const ledger=momentLedger(),markets=ledger.markets;
  const rows=s.clips.flatMap(reel=>momentsFor(reel.id).filter(coin=>markets[coin.ledgerId||coin.id||reel.id]?.owned>0).map(coin=>
    btn(esc(coin.name)+' · '+fmt(markets[coin.ledgerId||coin.id||reel.id].owned)+' coins',momentAction('tradeMoment',reel,coin),'subtle')));
  for(const creator of s.channels){
    const held=markets['creator-'+creator.id]?.owned;
    if(held&&creator.coin)rows.push(btn('$'+esc(creator.coin)+' · '+fmt(held)+' coins','demoCreatorTrade:'+esc(creator.id),'subtle'));
  }
  return '<p class="portfolioBalance"><span class="demoLabel">Demo</span> <strong>'+momentBNB(BigInt(ledger.cash))+' tBNB</strong></p>'+
    (rows.length?'<div class="portfolioPositions">'+rows.join('')+'</div>':'<p class="muted">No demo coins held.</p>');
}
function paintWallet(){
  if($('#holdings'))window.pulseWallet.portfolio($('#holdings'),s.channels);
  const chartOptions={range:marketRange,windowMs:marketWindows[marketRange],toUsd:marketDemoUsdRate};
  const sheet=$('#reelTicket');if(sheet&&$('dialog').open)window.pulseWallet.panel(sheet,chan(sheet.dataset.owner),chartOptions);
  const root=$('#chainPanel');if(root)window.pulseWallet.panel(root,chan(path()[1]),chartOptions);
}
window.addEventListener('pulse-wallet-change',()=>{if(accountScope!==(window.pulseWallet.account?.()||myId())){switchAccount();$('dialog')?.close();if(shared)loadShared();}if(path()[0]==='Login'&&!window.pulseWallet.signed()&&$('#walletLogin button:disabled'))return;if($('#reelTicket')&&$('dialog').open){paintWallet();return;}render();});
window.addEventListener('pulse-creator-linked',event=>{const c=self();if(c&&!c.walletId){c.walletId=event.detail;save();paintWallet();}});
const rankMetrics=[
  [['gained','Views gained'],['growth','View growth']],
  [['views','Video views gained'],['followers','Total followers'],['gained','New followers'],['growth','Follower growth']],
  [['pnl','Realized PnL (THB)']],
  [['pnl','Closed PnL (THB)']]
];
function ranks(){
  const since=cut(), clipRanks=category===0, positionRanks=category===3, profitability=category>=2;
  const trades=s.closed.filter(trade=>trade.t>=since);
  const items=clipRanks?s.clips:positionRanks?trades:category===2?s.channels.filter(c=>trades.some(t=>t.owner===c.id)):s.channels;
  const rows=items.map(item=>{
    const channel=clipRanks||positionRanks?chan(item.owner):item;
    const reel=clipRanks?item:s.clips.filter(c=>c.owner===channel?.id).at(-1);
    if(!channel)return null;
    const history=clipRanks?item.views:channel.followers;
    const {delta,pct}=stats(history,since);
    const mode=rankMetrics[category][metric][0];
    const channelViews=mode==='views'?s.clips.filter(c=>c.owner===channel.id).reduce((sum,clip)=>{const n=stats(clip.views,since).delta;return n==null||sum==null?null:sum+n;},0):null;
    const value=mode==='views'?channelViews:profitability?(positionRanks?item.pnl:pnl(channel.id)):mode==='growth'?pct:mode==='followers'?last(history):delta;
    const score=value==null?'No baseline':profitability?(value>0?'+':'')+fmt(value)+' THB':mode==='growth'?growth(value):fmt(value)+(clipRanks||mode==='views'?' views':' followers');
    return {channel,reel,value,score};
  }).filter(Boolean).sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity));
  const myIndex=category===2?rows.findIndex(row=>row.channel.id===myId()):-1;
  const rankCard=category===2?'<div class="myRank"><span>Your rank</span><strong>'+(myIndex<0?'Unranked':'#'+(myIndex+1)+' · '+rows[myIndex].score)+'</strong></div>':'';
  return '<section class="rankBoard" aria-label="Leaderboard">'+
    viewTabs('Leaderboard categories',[[2,'Traders'],[3,'Positions'],[0,'Channel videos'],[1,'Channels']],category,'category')+
    '<div class="rankFilters">'+viewTabs('Time window',[[0,'24h'],[1,'7d'],[2,'30d'],[3,'All time']],period,'range')+
    (profitability?'<small>Demo PnL · THB</small>':viewTabs('Ranking metric',rankMetrics[category].map(([,name],i)=>[i,name]),metric,'metric'))+'</div>'+rankCard+
    (rows.length?'<ol class="rankList">'+rows.map(({channel,reel,value,score},i)=>{
      const route=clipRanks?'Clips/'+reel.id:'Profile/'+channel.id;
      const name=clipRanks?reel.title:channel.name;
      const subtitle=clipRanks?channel.name:channel.coin?'$'+channel.coin:'';
      return '<li class="rankEntry"><span class="rankNumber">'+(value===null?'–':i+1)+'</span>'+
        link('<strong>'+esc(name)+'</strong>'+(subtitle?'<small>'+esc(subtitle)+'</small>':''),route,'rankIdentity')+
        '<strong class="'+(profitability&&value!==0?(value>0?'positive':'rankLoss'):'')+'">'+score+'</strong>'+reelThumb(reel)+'</li>';
    }).join('')+'</ol>':'<p class="emptyView">No rankings for this period.</p>')+'</section>';
}
function followedProfiles(){return [...new Set([...(s.profileFollows?.[myId()]||[]),...community.reactions.filter(r=>r.kind==='follow'&&r.actor===myId()).map(r=>r.target)])];}
function newest(items){return items.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));}
function profile(id=myId()){
  if(id==='me')id=myId();
  const channel=chan(id), mine=id===myId();
  if(!channel&&(!mine||shared&&sharedProfileStatus!=='ready')){
    const heading='<h1>Profile</h1>';
    if(sharedProfileStatus==='loading')return heading+'<p class="emptyView" role="status">Loading channel…</p>';
    if(sharedProfileStatus==='failed')return heading+'<p class="emptyView" role="status">Could not load this channel.</p>'+
      btn('Retry','retrySharedProfile','primary');
    return heading+'<p class="emptyView">Channel not found.</p>';
  }
  const owned=s.clips.filter(reel=>reel.owner===id);
  const items=mine&&tab?s.clips.filter(reel=>(s[['','reposts','likes','saves'][tab]].includes(reel.id)||tab===2&&community.reactions.some(r=>r.target===reel.id&&r.kind==='like'&&r.actor===myId()))):owned;
  const name=channel?.name||'My profile', handle=channel&&handleFor(channel);
  const likes=owned.reduce((total,reel)=>total+reelLikeCount(reel),0);
  const action=!channel?btn('Create channel','channel','primary'):channel.coin?link('Trade $'+esc(channel.coin),'Trading/'+channel.id,'primary'):mine?btn('Launch channel coin','launch','primary'):'';
  const following=followedProfiles();
  const isFollowing=following.includes(id);

  const stats=[['Following',(channel?.following||0)+(mine?following.length:community.reactions.filter(r=>r.kind==='follow'&&r.actor===id).length)],
    ['Followers',channel?followerTotal(channel):0],['Likes',likes]];
  const social=mine?'':'<div class="profileSocialActions">'+
    '<button type="button" class="profileFollow'+(isFollowing?'':' primary')+'" data-act="followProfile:'+esc(id)+
    '" aria-label="Follow '+esc(name)+'" aria-pressed="'+isFollowing+'">'+(isFollowing?'Following':'Follow')+'</button>'+
    link('Message','Inbox/'+id,'profileMessage')+'</div>';
  return '<section class="creatorProfile"><div class="creatorIntro"><div class="creatorDetails"><h1>'+esc(name)+'</h1>'+
    (handle?'<p>@'+esc(handle)+'</p>':'')+'<dl class="creatorStats">'+stats.map(([label,count])=>'<div><dt>'+label+'</dt><dd>'+fmt(count)+'</dd></div>').join('')+'</dl></div>'+profileAvatar(channel||{name},'creatorAvatar')+'</div>'+
    social+(action||mine&&channel?'<div class="creatorActions">'+action+(mine&&channel?btn('Create video','create','')+btn('Edit profile photo','editPhoto',''):'')+'</div>':'')+
    (mine?'<section class="panel portfolio"><h2>Your portfolio</h2><div id="demoHoldings">'+momentHoldings()+'</div><div id="holdings"></div></section>':'')+
    (mine?viewTabs('Profile videos',[[0,'Posts'],[1,'Reposts'],[2,'Liked'],[3,'Saved']],tab,'tab'):'<h2 class="profilePosts">Posts</h2>')+
    (items.length?'<div class="creatorGrid">'+newest(items).map(reel=>reelThumb(reel)).join('')+'</div>':'<p class="emptyView">No videos here yet.</p>')+'</section>';
}
const dockItems=[
  ['Trading','Trade'],
  ['Search','Explore','M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M15 15l6 6'],
  ['Clips','Video','M8 4l12 8-12 8z'],
  ['Inbox','Inbox','M3 5h18v13H3z M3 6l9 7 9-7'],
  ['Profile','Profile','M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2']
];
function loginScreen(){
  return '<section class="loginCard"><div class="loginArt" aria-hidden="true"></div><div class="loginBody"><h1>Wallet sign-in</h1><p>Use your wallet to trade creator coins on BSC Testnet.</p><div id="walletLogin"></div>'+link('Browse videos','Clips','guestLink')+'</div></section>';
}
function render({latestChat=false}={}){
  switchAccount();
  let [p,id]=path();
  if(p==='Leaderboard'){
    p='Search';id='Leaderboard';
    history.replaceState(null,'','#Search/Leaderboard');
  }
  if(p==='Moment'){
    const [,reelId,coinId]=path();
    const reel=clip(reelId),coin=momentFor(reelId,coinId);
    if(reel&&coin){
      history.replaceState(null,'','#Search');p='Search';id=undefined;
      queueMicrotask(()=>openMoment(reel,null,coin));
    }else{
      document.body.classList.remove('reelsPage');$('.aboutLink').hidden=true;
      if(communityReady||communityFailed||!shared){
        $('main').innerHTML='<h1>Moment Coin</h1><p role="status">'+(communityFailed?'Could not load this coin.':'Coin not found.')+'</p>'+link('Back to Explore','Search');
      }else $('main').innerHTML='<p role="status">Loading Moment Coin…</p>';
      document.title='Moment Coin · Pulse';return;
    }
  }
  if(!pages.includes(p))p='Clips';
  document.body.classList.toggle('reelsPage',p==='Clips');
  $('.aboutLink').hidden=p!=='Profile'||Boolean(id&&id!=='me'&&id!==myId());
  $('.accountLink').textContent=window.pulseWallet.signed()?'Wallet':'Sign in';
  $('nav').innerHTML=dockItems.map(([route,label,icon])=>{
    if(route==='Clips'&&p==='Clips')return '<button type="button" class="dockItem center active" data-act="create"><span class="dockIcon" aria-hidden="true">＋</span>Create</button>';
    const active=route===p && (route!=='Profile'||!id||id==='me');
    const symbol=route==='Trading'?tradeSymbol:'<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+icon+'"/></svg>';
    return '<a href="#'+route+'" class="dockItem '+(route==='Clips'?'center ':'')+(active?'active':'')+'" '+(active?'aria-current="page"':'')+'><span class="dockIcon">'+symbol+'</span>'+label+'</a>';
  }).join('');
  document.title=({Clips:id?clip(id)?.title:'Videos',Trading:id?chan(id)?.coin:'Coin markets',Profile:id?chan(id)?.name:'My profile',Search:id||'Explore',Inbox:id?chan(id)?.name+' · Inbox':'Inbox',Login:'Wallet sign-in'})[p]||p;document.title+=' · Pulse';
  const previous=p==='Clips'&&feedRoute===location.hash?activeReelWatch:null;
  activeReelWatch?.video.pause();
  for(const track of document.querySelectorAll('.reel video track'))if(track.src.startsWith('blob:'))URL.revokeObjectURL(track.src);
  feedRoute=p==='Clips'?location.hash:null;
  const oldThread=$('.inboxThread');
  const chatTop=!latestChat&&p==='Inbox'&&oldThread&&$('#inboxMessage').dataset.person===id&&!atChatBottom(oldThread)?oldThread.scrollTop:null;
  $('main').innerHTML=({Login:loginScreen,Trending:trending,Search:search,Clips:feed,Trading:trade,Inbox:inbox,Profile:profile})[p](id);observe(previous);paintWallet();paintMarketRows();
  if(p==='Inbox')mountChatHistory(chatTop);
  if(p==='Login')window.pulseWallet.loginPage($('#walletLogin'),()=>{
    if(['create','channel','launch'].includes(id)){go('Profile');action(id);return;}
    go(['portfolio','profile'].includes(id)?'Profile':id&&chan(id)?.coin?'Trading/'+id:'Clips');
  });
}
function modal(html){$('#form').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
const momentTradeStorage='pulse-moment-trading-v1';
const momentUnit=10n**16n, momentCurveCap=500000, momentTarget=momentUnit*3n/10n;
function ledgerKey(){return !shared&&accountScope==='me'?momentTradeStorage:stateKey+':'+momentTradeStorage+':'+accountScope;}
function momentLedger(){
  return readStore(ledgerKey(),v=>v&&/^\d+$/.test(v.cash)&&v.markets&&typeof v.markets==='object'&&Object.values(v.markets).every(p=>Number.isSafeInteger(p.sold)&&p.sold>=0&&p.sold<=momentCurveCap&&Number.isSafeInteger(p.owned)&&p.owned>=0&&p.owned<=p.sold&&(!p.fills||Array.isArray(p.fills)&&p.fills.every(f=>/^\d+$/.test(f.amount)&&Number.isSafeInteger(f.quantity)&&f.quantity>0))))||{cash:String(10n*momentUnit),markets:{}};
}
function momentPosition(ledger,id){return ledger.markets[id]||{sold:0,owned:0};}
function momentPrice(sold){return 4000000000n+8000n*BigInt(sold);}
function momentReserve(sold){return BigInt(sold)*(momentPrice(0)+momentPrice(sold))/2n;}
const momentCurve={price:momentPrice,reserve:momentReserve,cap:momentCurveCap,target:momentTarget};
const demoCreatorPrice=sold=>20000000000n+160000n*BigInt(sold);
const demoCreatorReserve=sold=>BigInt(sold)*(demoCreatorPrice(0)+demoCreatorPrice(sold))/2n;
const demoCreatorCurve={price:demoCreatorPrice,reserve:demoCreatorReserve,cap:500000,target:3n*momentUnit};
function curveMarketCap(sold,curve){
  return momentBNB(curve.price(sold)*BigInt(sold));
}
function demoTradePosition(ledger,marketId,sampleScope,now){
  if(ledger.markets[marketId]||!sampleScope)return momentPosition(ledger,marketId);
  return {sold:sampleTrades(sampleScope,now,'1m',1)[0]?.sold??0,owned:0,sampleAt:now};
}
function demoMarketHistory(position,sampleScope,now,range,curve){
  const sampleAt=Math.min(now,position.sampleAt??(position.fills?.length?0:now));
  const sample=sampleScope&&sampleAt?
    sampleTrades(sampleScope,sampleAt,range,Infinity).reverse():[];
  let sold=position.sold;
  const fills=(position.fills||[]).slice().reverse().map(fill=>{
    const point={...fill,sold,marketCap:curveMarketCap(sold,curve)};
    sold+=fill.side==='buy'?-fill.quantity:fill.quantity;
    return point;
  }).reverse();
  return [...sample,...fills].filter(fill=>fill.time>=now-marketWindows[range]&&fill.time<=now);
}
function momentBNB(amount){
  const decimals=(amount%momentUnit).toString().padStart(16,'0').replace(/0+$/,'');
  return (amount/momentUnit).toString()+(decimals?'.'+decimals:'');
}
function quoteMoment(position,side,requested,curve=momentCurve){
  if(side==='buy'&&position.sold===curve.cap)throw Error('All curve coins are held. You can still sell to the demo reserve.');
  if(!Number.isSafeInteger(requested)||requested<=0)throw Error('Enter a whole number of coins.');
  const buy=side==='buy';
  if(!buy&&requested>position.owned)throw Error('You do not have enough Moment Coins.');
  const quantity=buy?Math.min(requested,curve.cap-position.sold):requested;
  const sold=position.sold+(buy?quantity:-quantity);
  const amount=buy?curve.reserve(sold)-curve.reserve(position.sold):curve.reserve(position.sold)-curve.reserve(sold);
  return {side,requested,quantity,sold,amount,before:position.sold};
}
function quoteDemoBudget(position,budget,curve){
  let low=0,high=curve.cap-position.sold;
  const reserve=curve.reserve(position.sold);
  while(low<high){
    const quantity=Math.ceil((low+high)/2);
    if(curve.reserve(position.sold+quantity)-reserve<=budget)low=quantity;
    else high=quantity-1;
  }
  if(!low)throw Error('The budget is below the minimum buy amount, or the curve is full.');
  return quoteMoment(position,'buy',low,curve);
}
function settleMoment(reelId,preview,curve=momentCurve,sampleScope=null){
  const ledger=momentLedger(), position=demoTradePosition(ledger,reelId,sampleScope,preview.sampleAt??Date.now());
  const buying=preview.side==='buy';
  if(position.sold!==preview.before)throw Error('The price changed. Preview the trade again.');
  const quote=quoteMoment(position,preview.side,preview.requested,curve);
  const cash=BigInt(ledger.cash);
  if(buying&&cash<quote.amount)throw Error('Your demo tBNB balance is too low.');
  ledger.cash=String(cash+(buying?-quote.amount:quote.amount));
  const fill={time:Date.now(),side:quote.side,quantity:quote.quantity,amount:String(quote.amount)};
  ledger.markets[reelId]={sold:quote.sold,owned:position.owned+(buying?quote.quantity:-quote.quantity),
    fills:[...(position.fills||[]),fill].slice(-20),sampleAt:position.sampleAt};
  localStorage.setItem(ledgerKey(),JSON.stringify(ledger));
  return quote;
}
function momentMarketChart(curve,fills){
  const values=fills.map(fill=>curve.price(fill.sold)*BigInt(fill.sold));
  if(!values.length)return '<p class="momentChartEmpty">No trades in the selected '+marketRange+' window.</p>';
  const min=values.reduce((a,b)=>a<b?a:b), max=values.reduce((a,b)=>a>b?a:b);
  const y=value=>15+90*(1-Number(value-min)/Number(max-min||1n));
  const count=Math.min(values.length,120);
  const points=Array.from({length:count},(_,i)=>{
    const index=Math.floor(i*(values.length-1)/Math.max(1,count-1));
    return [count===1?160:8+i*304/(count-1),max===min?60:y(values[index])];
  });
  const mark=points.at(-1);
  const series=points.length===1?'<circle cx="'+mark[0]+'" cy="'+mark[1]+'" r="3" class="plotMarker"/>':
    '<polyline class="plotLine" points="'+points.map(point=>point.join(',')).join(' ')+'"/>';
  return '<div class="momentPlot"><svg viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="Market cap history">'+
    '<path class="plotGrid" d="M8 15H312 M8 60H312 M8 105H312"/>'+
    '<path class="plotGuide" d="M8 '+mark[1]+'H312"/>'+
    series+'</svg>'+
    '<div class="momentPlotScale'+(max===min?' flat':'')+'"><span>'+marketUsd(momentBNB(max))+'</span>'+(max===min?'':'<span>'+marketUsd(momentBNB(min))+'</span>')+'</div></div>'+
    '<div class="momentPlotAxis"><span>First shown fill</span><span>Latest fill</span></div>';
}
function momentFillList(fills){
  const rows=fills.slice().reverse().map(fill=>{
    const buying=fill.side==='buy';
    return '<li><strong class="'+(buying?'bought':'sold')+'">'+(buying?'Buy':'Sell')+'</strong><span>'+fmt(fill.quantity)+' coins</span><span>'+momentBNB(BigInt(fill.amount))+' tBNB</span><small>'+esc(fill.time?new Date(fill.time).toLocaleString():'Time unavailable')+'</small></li>';
  }).join('');
  return '<details class="momentFillList"><summary>Recent trades <span>'+fills.length+'</span></summary>'+
    (rows?'<ol>'+rows+'</ol>':'<p>No trades recorded yet.</p>')+'</details>';
}
function openMomentTrade(reel,coin,options={}){
  if(!coin)return;
  const coinId=coin.id||reel.id, marketId=coin.ledgerId||coinId;
  openDemoTrade({reel,coin,marketId,curve:momentCurve,
    sampleScope:isSampleMoment(reel.id,coin)?'moment-'+reel.id:null},options);
}
function openDemoCreatorTrade(creator,options){
  if(!creator?.coin)return;
  const reel=s.clips.find(item=>item.owner===creator.id);
  const marketId='creator-'+creator.id;
  openDemoTrade({creator,reel,coin:{name:'$'+creator.coin},marketId,curve:demoCreatorCurve,sampleScope:marketId},options);
}
function openDemoTrade(market,{back=()=>$('dialog').close(),now=Date.now()}={}){
  const {reel,coin,creator,marketId,curve,sampleScope}=market;
  const coinId=coin.id||reel?.id;
  const coins=creator?[]:momentsFor(reel.id);
  const switcher=coins.length>1?'<label class="momentCoinSwitcher">Switch coin <select id="momentCoinSelect">'+
    coins.map(option=>{
      const id=option.id||reel.id;
      return '<option value="'+esc(id)+'"'+(id===coinId?' selected':'')+'>'+
        esc(option.name)+' · '+momentTime(option.time)+'</option>';
    }).join('')+'</select></label>':'';
  const ledger=momentLedger(),position=demoTradePosition(ledger,marketId,sampleScope,now);
  const reserve=curve.reserve(position.sold);
  const complete=position.sold===curve.cap;
  const label=esc(coin.name), fills=position.fills||[];
  const history=demoMarketHistory(position,sampleScope,now,marketRange,curve);
  const imageStyle=reel?frameArt(coin,reel):'', cap=curveMarketCap(position.sold,curve), balance=momentBNB(BigInt(ledger.cash));
  const source=creator?link(esc(creator.name),'Profile/'+creator.id,'subtle'):btn(esc(reel.title)+' ↗',momentAction('momentDetail',reel,coin),'subtle');
  modal('<section id="momentTicket" aria-label="'+(creator?'Creator':'Moment')+' Coin trading">'+
    '<div class="momentMarketHeader"><button type="button" class="momentBack" aria-label="Back" title="Back">'+
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg></button></div>'+
    '<div class="momentAsset"><span class="momentAssetArt" aria-hidden="true" style="'+imageStyle+'">'+(imageStyle?'':esc(coin.name[0]))+'</span>'+
    '<div class="momentAssetMeta"><h2>'+label+' <span class="demoLabel">Demo</span></h2>'+source+switcher+'</div>'+
    '<div class="momentAssetPrice"><strong>'+marketUsd(cap)+'</strong><small>Market cap</small></div></div>'+
    '<div class="momentChart"><div class="momentChartHeading"><strong>History · '+marketRange+'</strong><small>USD</small></div>'+
    momentMarketChart(curve,history)+'</div>'+
    '<div class="momentPosition"><div class="momentTradeStats"><div><small>Your coins</small><strong>'+fmt(position.owned)+'</strong></div>'+
    '<div><small>Demo balance</small><strong>'+balance+' tBNB</strong></div></div>'+
    '<label class="momentTradeProgress">Curve reserve <strong>'+momentBNB(reserve)+' / '+momentBNB(curve.target)+' tBNB</strong><progress max="'+curve.target+'" value="'+reserve+'"></progress></label></div>'+
    momentFillList(fills)+
    '<div class="momentTradeFooter">'+(complete?'<p>Curve fully bought. Sell to redeem from the demo reserve.</p>':'')+
      '<form id="momentOrder" novalidate><div class="momentOrderActions"><label>Buy budget (tBNB)<input name="budget" type="number" min="0.0000000000000001" step="any" value="0.05" required></label>'+
      '<label>Sell (% of holdings)<input name="percent" type="number" min="1" max="100" step="1" value="100" required></label>'+
      '<button class="tradeBuy" type="submit" value="buy" '+(complete?'disabled':'')+'>Preview buy</button><button class="tradeSell" type="submit" value="sell">Preview sell</button></div></form>'+
      '<div class="momentOrderPreview" hidden></div>'+'<p class="momentTradeStatus" role="status"></p></div></section>');
  $('.momentBack').onclick=back;
  const select=$('#momentCoinSelect');
  select?.addEventListener('change',()=>{
    const next=momentFor(reel.id,select.value);
    if(!next||next===coin)return;
    openMomentTrade(reel,next,{back});
    $('#momentCoinSelect')?.focus({preventScroll:true});
  });
  const form=$('#momentOrder');
  if(!form)return;
  const panel=$('.momentOrderPreview'), status=$('.momentTradeStatus');
  form.addEventListener('input',()=>{panel.hidden=true;status.textContent='';});
  form.addEventListener('submit',event=>{
    event.preventDefault();event.stopPropagation();
    status.textContent='';panel.hidden=true;
    let quote;
    try{
      const sell=event.submitter?.value==='sell';
      const input=form.elements[sell?'percent':'budget'];
      if(!input.reportValidity()||!input.value)return;
      const snapshot=demoTradePosition(momentLedger(),marketId,sampleScope,now);
      if(sell)quote=quoteMoment(snapshot,'sell',Math.floor(snapshot.owned*input.valueAsNumber/100),curve);
      else{
        const parts=input.value.match(/^(\d*)(?:\.(\d{0,16}))?$/);
        if(!parts)throw Error('Enter a tBNB amount with up to 16 decimal places.');
        const budget=BigInt(parts[1]||0)*momentUnit+BigInt((parts[2]||'').padEnd(16,'0'));
        quote=quoteDemoBudget(snapshot,budget,curve);
        if(quote.amount>BigInt(momentLedger().cash))throw Error('Your demo tBNB balance is too low.');
      }
      quote.sampleAt=snapshot.sampleAt;
    }
    catch(error){status.textContent=error.message;return;}
    const buy=quote.side==='buy', verb=buy?'Buy':'Sell';
    panel.hidden=false;
    panel.innerHTML='<p>Market cap '+marketUsd(curveMarketCap(quote.before,curve))+' → '+marketUsd(curveMarketCap(quote.sold,curve))+'</p>'+
      '<p>'+(buy?'Pay ':'Receive ')+momentBNB(quote.amount)+' tBNB · '+fmt(quote.quantity)+' coins</p>'+
      (quote.quantity<quote.requested?'<p>Only '+fmt(quote.quantity)+' coins remain. You pay for the filled amount.</p>':'')+
      (quote.sold===curve.cap?'<p>This purchase fills the curve. Holders can still sell back to the demo reserve.</p>':'')+
      '<small>Platform fee: 0 tBNB</small><button type="button" class="primary">Confirm '+verb+'</button>';
    const confirm=panel.querySelector('button');
    confirm.onclick=async()=>{
      confirm.disabled=true;
      try{
        const walletScope=accountScope;
        const execute=()=>{if(walletScope!==accountScope)throw Error('Account changed. Preview again.');return settleMoment(marketId,quote,curve,sampleScope);};
        const fill=navigator.locks?await navigator.locks.request(ledgerKey(),execute):execute();
        if(!status.isConnected||!$('dialog').open)return;
        if($('.marketHome'))render();
        if($('#demoHoldings'))$('#demoHoldings').innerHTML=momentHoldings();
        openDemoTrade(market,{back});
        $('.momentTradeStatus').textContent=(buy?'Bought ':'Sold ')+fmt(fill.quantity)+' coins for '+momentBNB(fill.amount)+' tBNB.';
      }catch(error){
        if(!status.isConnected)return;
        panel.hidden=true;status.textContent=error.message;
      }
    };
  });
}
function openReelTrade(reel,source){
  if(!reel)return;
  const coins=momentsFor(reel.id);
  if(coins.length>1)return openMomentPicker(reel);
  if(coins.length===1)return openMomentTrade(reel,coins[0]);
  const creator=chan(reel.owner);
  if(!creator?.coin)return openMoment(reel,source);
  if(!useTestnetFills)return openDemoCreatorTrade(creator);
  modal('<div class="reelTradeHeading"><small>CREATOR MARKET</small><strong>'+esc(creator.name)+'</strong></div>'+
    '<div id="reelTicket" class="chainPanel" data-owner="'+esc(creator.id)+'"></div>');
  paintWallet();
}
async function shareReel(reel){
  if(!reel)return;
  const url=reelLink(reel);
  try{
    if(reel.owner==='me'){
      const source=urls[reel.id];
      if(source&&navigator.share&&navigator.canShare){
        const blob=await (await fetch(source)).blob();
        const extension=blob.type==='video/quicktime'?'mov':(blob.type.split('/')[1]||'mp4').split(';')[0];
        const files=[new File([blob],reel.title+'.'+extension,{type:blob.type})];
        if(navigator.canShare({files})){
          await navigator.share({title:reel.title,files});return;
        }
      }
      if(source){
        const download=document.createElement('a');
        download.href=source;download.download=reel.title;
        download.click();
        toast('Video downloaded. You can share the file.');
      }else toast('This video is only available in the browser that uploaded it.');
      return;
    }
    if(navigator.share){
      await navigator.share({title:reel.title,url});return;
    }
  }catch(error){if(error.name==='AbortError')return;}
  if(reel.owner==='me')return toast('Unable to share this video.');
  try{
    await navigator.clipboard.writeText(url);toast('Video link copied');
  }catch{
    modal('<label>Share video<input readonly value="'+esc(url)+'"></label>');
    $('#form input').select();
  }
}
function momentTime(seconds){
  const ticks=Math.round(seconds*100);
  return Math.floor(ticks/6000)+':'+((ticks%6000)/100).toFixed(2).padStart(5,'0');
}
function momentCrop(video,canvas,initial,form){
  const crop={...(initial||{zoom:1,x:.5,y:.5})};
  if(!canvas)return null;
  const ctx=canvas.getContext('2d');
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const side=()=>Math.min(video.videoWidth,video.videoHeight)/crop.zoom;
  function redraw(){
    if(video.readyState<2||video.seeking||!side())return;
    const length=side(), width=video.videoWidth, height=video.videoHeight;
    crop.x=clamp(crop.x,length/(2*width),1-length/(2*width));
    crop.y=clamp(crop.y,length/(2*height),1-length/(2*height));
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(video,crop.x*width-length/2,crop.y*height-length/2,length,length,0,0,canvas.width,canvas.height);
  }
  function pan(px,py){
    if(!side())return;
    const scale=side()/canvas.getBoundingClientRect().width;
    crop.x-=px*scale/video.videoWidth;
    crop.y-=py*scale/video.videoHeight;
    redraw();
  }
  if(form){
    const zoom=form.elements.zoom, value=form.querySelector('.momentZoom output');
    zoom.oninput=()=>{
      crop.zoom=Number(zoom.value);value.textContent=crop.zoom.toFixed(2)+'×';
      redraw();
    };
    form.querySelector('.momentCropReset').onclick=()=>{
      Object.assign(crop,{zoom:1,x:.5,y:.5});zoom.value='1';zoom.oninput();
    };
    let drag;
    canvas.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0)return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove',event=>{
      if(drag?.id!==event.pointerId)return;
      pan(event.clientX-drag.x,event.clientY-drag.y);
      drag.x=event.clientX;drag.y=event.clientY;
    });
    canvas.addEventListener('lostpointercapture',()=>{drag=null;});
    canvas.addEventListener('keydown',event=>{
      const offsets={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};
      if(!offsets[event.key])return;
      event.preventDefault();pan(...offsets[event.key]);
    });
  }
  return {crop,redraw};
}
function momentMedia(reel){
  return reel.media || (reel.owner==='me'?urls[reel.id]:'media/'+reel.id+'.mp4');
}
function drawMomentPickerFrames(sheet,media,coins){
  if(!media||coins.every(c=>c.frame))return;
  const video=document.createElement('video'), dialog=sheet.closest('dialog');
  video.crossOrigin='anonymous';
  video.hidden=true;
  video.muted=true;
  video.playsInline=true;
  video.preload='auto';
  const frames=[...sheet.querySelectorAll('.momentPickerFrame')];
  let index=0;
  function stop(){
    dialog.removeEventListener('close',onClose);
    video.removeAttribute('src');
    video.load();
    video.remove();
  }
  function drawNext(){
    while(index<frames.length&&sheet.isConnected&&dialog.open){
      const coin=coins[index], canvas=frames[index];
      if(coin.frame){canvas.hidden=true;index++;continue;}
      const time=Math.min(coin.time,Math.max(0,video.duration-.01));
      if(!Number.isFinite(time))break;
      if(Math.abs(video.currentTime-time)>=.001){
        video.currentTime=time;
        return;
      }
      if(video.seeking||video.readyState<2)return;
      momentCrop(video,canvas,coin.crop).redraw();
      index++;
    }
    stop();
  }
  function onClose(){if(!dialog.open||!sheet.isConnected)stop();}
  video.addEventListener('loadeddata',drawNext);
  video.addEventListener('seeked',drawNext);
  video.addEventListener('error',stop,{once:true});
  dialog.addEventListener('close',onClose);
  sheet.append(video);
  video.src=media;
}
function openMomentPicker(reel){
  const coins=momentsFor(reel.id), ledger=momentLedger();
  modal('<section class="momentSheet"><h2>Moment Coins</h2><p class="momentSource">'+esc(reel.title)+'</p>'+
    '<ul class="momentPicker">'+coins.map(coin=>{
      const scope=isSampleMoment(reel.id,coin)?'moment-'+reel.id:null;
      const position=demoTradePosition(ledger,coin.ledgerId||coin.id||reel.id,scope,Date.now()),art=frameArt(coin,reel);
      return '<li><button type="button" class="momentPickerCoin" data-act="'+momentAction('momentDetail',reel,coin)+'">'+
        '<span class="assetArt" style="'+frameArt(coin,reel)+'" aria-hidden="true">'+(art?'':esc(coin.name[0]))+
        '<canvas class="momentPickerFrame" '+(coin.frame?'hidden':'')+' width="112" height="112"></canvas></span>'+
        '<span class="momentPickerName"><strong>'+esc(coin.name)+'</strong><small>Frame '+momentTime(coin.time)+'</small></span></button>'+
        '<dl class="momentPickerStats"><div><dt>Market cap</dt><dd>'+marketUsd(momentMarketCap(position))+'</dd></div>'+
        '<div><dt>Age</dt><dd>'+esc(marketAge(momentCreatedAt(coin)))+'</dd></div></dl>'+
        btn('Trade',momentAction('tradeMoment',reel,coin),'marketTrade')+'</li>';
    }).join('')+'</ul>'+btn('Create another Moment Coin','newMoment:'+esc(reel.id),'primary')+'</section>');
  drawMomentPickerFrames($('#form .momentSheet'),momentMedia(reel),coins);
}
function openMoment(reel,source,existing=momentFor(reel?.id)){
  if(!reel)return;
  const media=source?.getAttribute('src')||momentMedia(reel);
  if(!media&&!existing?.frame)return toast('This clip is unavailable.');
  if(existing?.frame){
    modal('<section class="momentSheet"><h2>'+esc(existing.name)+'</h2><img class="savedFrame" alt="Captured frame" src="'+esc(existing.frame)+'"><p>'+esc(existing.description)+'</p><p>'+momentTime(existing.time)+' · '+esc(existing.launcher)+'</p><div class="momentDetailActions">'+btn('Trade',momentAction('tradeMoment',reel,existing),'primary')+shareMomentButton(existing,reel)+btn('Create another Moment Coin','newMoment:'+esc(reel.id),'subtle')+'</div></section>');
    return;
  }
  const hasCrop=!existing||Boolean(existing.crop);
  const resume=source&&!source.paused;
  source?.pause();
  const start=existing?.time??source?.currentTime??0;
  modal('<section class="momentSheet"><h2>'+(existing?'Moment Coin':'Create Moment Coin')+'</h2>'+
    '<p class="momentSource">'+esc(reel.title)+' · '+esc(chan(reel.owner).name)+'</p>'+
    '<video crossorigin="anonymous" class="momentPreview" muted playsinline preload="auto" src="'+esc(media)+'"'+(hasCrop?' hidden':' aria-label="Selected frame"')+'></video>'+
    (hasCrop?'<canvas class="momentCrop" width="512" height="512" '+(existing?'role="img" aria-label="Cropped Moment Coin frame"':'tabindex="0" aria-label="Crop preview" aria-describedby="momentCropHelp"')+'></canvas>':'')+
    (existing?'<h3>'+esc(existing.name)+'</h3><p>'+esc(existing.description)+'</p><p>Frame '+momentTime(existing.time)+' · Created by '+esc(existing.launcher||'You')+'</p><small>Demo Moment Coin</small><div class="momentDetailActions">'+btn('Trade',momentAction('tradeMoment',reel,existing),'primary')+shareMomentButton(existing,reel)+
      btn('Create another Moment Coin','newMoment:'+esc(reel.id),'subtle')+
      (momentsFor(reel.id).length>1?btn('All moments','reelMoment:'+esc(reel.id),'subtle'):'')+'</div>':
      '<form id="momentLaunch"><label class="momentTimeline">Choose a frame <output></output><input name="frame" type="range" min="0" step=".01" value="0" disabled></label>'+
      '<div class="momentCropControls"><label class="momentZoom">Zoom <output>1.00×</output><input name="zoom" type="range" min="1" max="4" step=".05" value="1"></label><button type="button" class="subtle momentCropReset">Reset crop</button></div>'+
      '<p id="momentCropHelp">Drag the frame or use arrow keys to position it.</p>'+
      '<label>Coin name<input name="name" maxlength="60" required></label>'+
      '<label>Description<textarea name="description" maxlength="220" rows="2" required></textarea></label>'+
      '<button type="submit" class="primary" disabled>Create demo coin</button><small>'+(shared&&window.pulseWallet.signed()?'Published to the shared demo market':'Guest demo · saved on this device')+'</small></form>')+
    '<p class="momentStatus" role="status">Loading clip…</p></section>');
  const dialog=$('dialog'), preview=$('.momentPreview'), form=$('#momentLaunch'), status=$('.momentStatus');
  const track=form?.elements.frame, submit=form?.querySelector('button[type=submit]');
  const editor=momentCrop(preview,$('.momentCrop'),existing?.crop,form);
  function seek(){
    const time=track?Number(track.value):Math.min(start,preview.duration);
    if(track)form.querySelector('output').textContent=momentTime(time)+' / '+momentTime(preview.duration);
    if(Math.abs(preview.currentTime-time)<.001&&!preview.seeking){ready();return;}
    if(submit)submit.disabled=true;
    preview.currentTime=time;
  }
  preview.addEventListener('loadedmetadata',()=>{
    if(!Number.isFinite(preview.duration)||preview.duration<=0){status.textContent='Unable to read this clip timeline.';return;}
    if(track){
      track.max=Math.floor(preview.duration*100)/100;
      track.value=Math.min(Number(track.max),start).toFixed(2);
      track.disabled=false;
      track.oninput=seek;
    }
    seek();
  });
  const ready=()=>{
    if(preview.readyState<2||preview.seeking||preview.error)return;
    editor?.redraw();
    status.textContent='';if(submit)submit.disabled=false;
  };
  preview.addEventListener('loadeddata',ready);
  preview.addEventListener('seeked',ready);
  preview.addEventListener('seeking',()=>{if(submit)submit.disabled=true;});
  preview.addEventListener('error',()=>{status.textContent='Unable to load this clip.';if(submit)submit.disabled=true;});
  if(form)form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopPropagation();
    if(submit.disabled)return;
    const name=form.elements.name.value.trim(), description=form.elements.description.value.trim();
    if(!name||!description){status.textContent='Enter a coin name and description.';return;}
    const latest=readStore(stateKey,v=>v&&typeof v==='object');
    s.moments={...s.moments,...latest?.moments};
    const previous=s.moments[reel.id], coins=momentsFor(reel.id);
    const coin={name,description,time:Number(track.value),crop:editor.crop,ownerId:reel.owner,clipId:reel.id,
      createdAt:Date.now(),launcher:self()?.name||'You'};
    const publish=Boolean(shared&&window.pulseWallet.signed());
    submit.disabled=true;
    try{
      coin.frame=$('.momentCrop').toDataURL('image/jpeg',.74);
      if(publish){
        coin.id=form.dataset.coinId||=crypto.randomUUID();
        await shared.post('moments',{id:coin.id,clip:reel.id,name,description,frame_time:coin.time,frame:coin.frame});
        await refreshCommunity();
      }else{
        if(coins.length)coin.id=crypto.randomUUID();
        s.moments[reel.id]=[...coins.filter(item=>!item.published),coin];save();
      }
    }catch(e){
      if(!publish){if(previous===undefined)delete s.moments[reel.id];else s.moments[reel.id]=previous;}
      status.textContent=e.message||'Could not save this Moment Coin.';submit.disabled=false;return;
    }
    if(!form.isConnected)return;
    const byline=[...document.querySelectorAll('.reel')].find(item=>item.dataset.id===reel.id)?.querySelector('.byline');
    const badge=byline?.querySelector('.momentPill');
    if(badge)badge.outerHTML=momentBadge(reel);
    else byline?.insertAdjacentHTML('beforeend',momentBadge(reel));
    openMoment(reel,source,coin);
    toast('Created '+name+' · Demo Moment Coin');
  });
  dialog.addEventListener('close',()=>{
    if(resume&&source.isConnected)source.play().catch(()=>{});
  },{once:true});
}

let momentHold;
function cancelMomentHold(){
  clearTimeout(momentHold?.timer);momentHold=null;
}
document.addEventListener('pointerdown',event=>{
  const area=event.target.closest('.momentGesture');
  if(!area||!event.isPrimary||event.button!==0)return;
  cancelMomentHold();
  const {pointerId,clientX,clientY}=event;
  const reel=area.closest('.reel');
  const timer=setTimeout(()=>{
    if(!area.isConnected)return cancelMomentHold();
    openMoment(clip(reel.dataset.id),reel.querySelector('video'));
  },500);
  momentHold={pointerId,clientX,clientY,timer};
});
document.addEventListener('pointermove',event=>{
  if(momentHold?.pointerId===event.pointerId&&Math.hypot(event.clientX-momentHold.clientX,event.clientY-momentHold.clientY)>10)cancelMomentHold();
});
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{
  if(momentHold?.pointerId===event.pointerId)cancelMomentHold();
});
document.addEventListener('contextmenu',event=>{
  if(event.target.closest('.momentGesture'))event.preventDefault();
});

function toast(msg){$('#notice').textContent=msg;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').textContent='',3400);}
function channelForm(next){modal('<h2>Create channel</h2><form id="channel" data-next="'+next+'"><label>Channel name<input name="name" required maxlength="48"></label><button class="primary">Create channel</button></form>');}
function create(){if(!self())return channelForm('create');modal('<h2>Create video</h2><form id="upload"><label>Video title<input name="title" required maxlength="90"></label><label>Video · MP4, WebM or MOV · up to 50 MiB<input type="file" name="video" required accept="video/mp4,video/webm,video/quicktime,.mov"></label><label>Captions (optional, WebVTT)<input type="file" name="captions" accept=".vtt,text/vtt"></label><p class="uploadStatus" role="status"></p><button class="primary">Publish video</button></form>');}
async function setSharedReaction(el,kind,target){
  if(!requireCommunityAccount()||el.disabled)return;
  const viewer=myId(),on=!community.reactions.some(r=>r.actor===viewer&&r.kind===kind&&r.target===target);
  el.disabled=true;
  try{
    await shared.react(kind,target,on);
    if(viewer!==myId())return;
    await refreshCommunity();
    if(kind==='follow')render();else updateReelSocial(target);
  }catch(e){toast(e.message||'Could not update. Please retry.');}
  finally{el.disabled=false;}
}
function updateReelSocial(id){
  const reel=clip(id),article=$('.reel[data-id="'+CSS.escape(id)+'"]');
  if(!reel||!article)return;
  article.querySelector('.reelRail').outerHTML=reelActions(reel);
  const badge=article.querySelector('.momentPill');
  if(badge)badge.outerHTML=momentBadge(reel);else article.querySelector('.byline').insertAdjacentHTML('beforeend',momentBadge(reel));
}
function aboutPulse(category='overview'){
  const overview='<p>Pulse is a short-video platform for clips of any genre. We started Pulse after seeing memorable clips turn into meme coins with little going back to the people who made them.</p>'+
    '<p>Creators can launch a Creator Coin for their channel. When a clip makes you laugh or sticks with you, capture a frame, add a name and description, and turn it into a Moment Coin tied to the original video.</p>';
  const fees='<h3>Moment Coin trading fees</h3><p>Pulse’s planned production fee applies to each buy or sell on the bonding curve.</p>'+
    '<dl class="aboutRates"><dt><strong>Total trading fee</strong></dt><dd>0.75%</dd>'+
    '<dt>Original clip creator</dt><dd>0.50%</dd><dt>Pulse protocol</dt><dd>0.25%</dd></dl>'+
    '<p>Percentages are based on the trade amount. Network gas is charged separately.</p>'+
    '<h3>Moment Coin allocation</h3><p>At launch, 10% of the total coin supply is reserved for the original clip creator, separate from trading fees.</p>';
  modal('<section class="aboutPulse" aria-labelledby="aboutPulseTitle">'+
  '<h2 id="aboutPulseTitle">About us</h2>'+
  viewTabs('About us categories',[['overview','Overview'],['fees','Fees']],category,'aboutCategory')+
  (category==='fees'?fees:overview)+'</section>');
}
function action(str,el){let [k,v,id]=str.split(':');
if(k==='about')return aboutPulse();
if(k==='aboutCategory'){
  aboutPulse(v==='fees'?'fees':'overview');
  $('.aboutPulse [aria-pressed="true"]')?.focus({preventScroll:true});
  return;
}
if(k==='retrySharedProfile'&&shared)return loadShared();
if(shared && ['channel','create','launch'].includes(k) && !window.pulseWallet.signed()){
  toast('Sign in with your wallet to publish.');return go('Login/'+k);
}
if(k==='editPhoto'){
  if(!self())return;
  modal('<h2>Edit profile photo</h2><form id="profilePhoto"><label>JPG, PNG or WebP · up to 10 MB<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label>'+
    '<div class="photoPreview" aria-label="Cropped photo preview"></div>'+
    ['Horizontal','Vertical','Zoom'].map((name,i)=>'<label>'+name+'<input name="'+['x','y','zoom'][i]+'" type="range" min="'+(i===2?1:0)+'" max="'+(i===2?4:1)+'" step=".01" value="'+(i===2?1:.5)+'"></label>').join('')+
    '<button class="primary">Save photo</button></form>');
  const form=$('#profilePhoto');let sequence=0;
  form.oninput=async()=>{
    const file=form.elements.photo.files[0],job=++sequence;
    if(!file)return;
    try{const canvas=await prepareProfilePhoto(file,Number(form.elements.x.value),Number(form.elements.y.value),Number(form.elements.zoom.value));
      if(form.isConnected&&job===sequence)form.querySelector('.photoPreview').replaceChildren(canvas);
    }catch(error){formError(form,error.message);}
  };
  return;
}
if(k==='followProfile'&&shared&&chan(v)?.shared&&window.pulseWallet.signed())return setSharedReaction(el,'follow',v);
if(k==='toggle'&&v==='likes'&&shared)return setSharedReaction(el,'like',id);
if(k==='followProfile'){
  if(v===myId()||!chan(v))return;
  const following=followedProfiles();
  (s.profileFollows??={})[myId()]=following.includes(v)?following.filter(id=>id!==v):[...following,v];
  save();render();$('.profileFollow')?.focus();
  return;
}
if(k==='moreExplore'){exploreLimit+=24;$('#exploreResults').innerHTML=exploreResults();return;}
if(k==='hashtag'){exploreLimit=24;query=v;exploreTab='reels';return go('Search');}
if(k==='comments'||k==='reply')return showComments(clip(v),id);
if(k==='commentLike'){
  const comment=reelComments(v).find(item=>item.id===id);
  if(!comment)return;
  const liked=!comment.liked;
  if(comment.demo||community.comments.some(c=>c.id===id)){
    const likes=s.demoCommentLikes||[];
    s.demoCommentLikes=liked?[...likes,id]:likes.filter(key=>key!==id);
  }else comment.liked=liked;
  save();el.setAttribute('aria-pressed',String(liked));return;
}
if(k==='reelReport')return reportReel(clip(v));
if(k==='reelSound'){
  const watch=activeReelWatch;
  if(watch?.id!==v)return;
  const video=watch.video;
  reelAudioEnabled=video.muted||video.volume===0;
  if(reelAudioEnabled&&video.volume===0)video.volume=1;
  video.muted=!reelAudioEnabled;
  updateSoundButton(el.closest('.reel'),video);
  if(video.paused)watch.play();
  return;
}
if(k==='demoCreatorTrade')return openDemoCreatorTrade(chan(v),{now:el?.closest('.marketRow')?marketPaintedAt:undefined});
if(k==='publishMoment')return publishSavedMoment(clip(v),momentFor(v,id),el);
if(k==='tradeMoment'||k==='momentDetail'||k==='reelMoment'||k==='newMoment'){
  const reel=clip(v);
  if(!reel)return;
  const source=el.closest('.reel')?.querySelector('video');
  if(k==='newMoment')return openMoment(reel,source,null);
  const coin=momentFor(v,id);
  if(k==='tradeMoment'){
    if(!coin)return;
    const returnTo=el.closest('.momentPicker')?()=>openMomentPicker(reel):
      el.closest('.momentDetailActions')?()=>openMoment(reel,source,coin):null;
    const back=returnTo?()=>{
      returnTo();
      [...$('#form').querySelectorAll('[data-act]')].find(button=>button.dataset.act===str)?.focus();
    }:undefined;
    return openMomentTrade(reel,coin,{back,now:el.closest('.marketRow')?marketPaintedAt:undefined});
  }
  if(k==='reelMoment'&&momentsFor(v).length>1)return openMomentPicker(reel);
  if(id&&!coin)return;
  return openMoment(reel,source,coin);
}
if(k==='reelShare')return shareReel(clip(v));if(k==='reelTrade')return openReelTrade(clip(v),el.closest('.reel')?.querySelector('video'));if(k==='explore'){
  if(v==='leaderboard')return go('Search/Leaderboard');
  exploreLimit=24;exploreTab=v;return go('Search');
}if(k==='group'){marketGroup=v;return render();}

if(k==='marketTime'||k==='marketSource'){
  if(k==='marketTime'&&Object.hasOwn(marketWindows,v))marketRange=v;
  if(k==='marketSource')useTestnetFills=v==='testnet';
  render();document.querySelector('.marketControls [data-act="'+k+':'+v+'"]')?.focus({preventScroll:true});return;
}
if(k==='watch'){const list=s.watchlist||[];s.watchlist=list.includes(v)?list.filter(x=>x!==v):[...list,v];save();return render();}
if(k==='create')return create();if(k==='channel')return channelForm('profile');if(k==='launch')return modal('<h2>Launch Channel coin</h2><p>Every video on your channel will link to this coin.</p><form id="launch"><label>Coin symbol (2–8 letters, A–Z)<input required pattern="[A-Za-z]{2,8}" name="symbol"></label><p>Choose a symbol, then open the market to register your coin with your wallet on BSC Testnet.</p><button class="primary">Confirm launch</button></form>');if(k==='toggle'){s[v]=s[v].includes(id)?s[v].filter(x=>x!==id):[...s[v],id];save();el.classList.toggle('selected',s[v].includes(id));el.setAttribute('aria-pressed',String(s[v].includes(id)));
if(v==='likes'){const n=reelLikeCount(clip(id));el.querySelector('small').textContent=shortNumber.format(n);el.setAttribute('aria-label','Like · '+fmt(n));}
return;}if(k==='category'){category=+v;metric=0;}if(k==='metric')metric=+v;if(k==='range')period=+v;if(k==='tab')tab=+v;if(k==='side')side=v;render();}
document.addEventListener('click',e=>{
  const center=e.target.closest('.momentGesture');
  if(center){
    const reel=center.closest('.reel'), video=reel.querySelector('video');
    if(e.detail===0)openMoment(clip(reel.dataset.id),video);
    else if(video&&!$('dialog').open){if(video.paused)video.play().catch(()=>{});else video.pause();}
    return;
  }
  let el=e.target.closest('[data-go],[data-act]');if(!el)return;if(el.dataset.go)go(el.dataset.go);else action(el.dataset.act,el);});
document.addEventListener('load',event=>{
  if(event.target instanceof HTMLImageElement&&event.target.matches('.profileAvatarImage'))event.target.classList.add('avatarReady');
},true);
document.addEventListener('change',e=>{if(e.target.id==='token')go('Trading/'+e.target.value);});
document.addEventListener('input',e=>{if(e.target.id==='search'){exploreLimit=24;query=e.target.value;$('#exploreResults').innerHTML=exploreResults();}});
const dbReady=!shared && new Promise((resolve,reject)=>{let req=indexedDB.open('pulse-clips',1);req.onupgradeneeded=()=>req.result.createObjectStore('videos');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);});
async function hydrate(){let db=await dbReady;let req=db.transaction('videos').objectStore('videos').openCursor();req.onsuccess=()=>{let cur=req.result;if(cur){urls[cur.key]=URL.createObjectURL(cur.value);cur.continue();}else if(['Clips','Profile','Search'].includes(path()[0]))render();};}
let sharedRead = 0;
let sharedSignature = null;
let loadedScope;
function profileScope(){
  const [route,id]=path(),owner=id&&id!=='me'?id:myId();
  return route==='Profile'&&/^[0-9a-f-]{36}$/i.test(owner)?owner:null;
}
let refreshAfterClose=false;
document.addEventListener('close',e=>{
  if(e.target===$('dialog')&&refreshAfterClose){refreshAfterClose=false;updateVisibleData();}
},true);
function updateVisibleData(){
  if($('dialog').open){refreshAfterClose=true;return;}
  const [route,id]=path();
  if(route==='Moment'){render();return;}
  if(route==='Clips'&&$('.feed')&&(!id||clip(id))){
    const root=$('.feed');
    for(const node of root.querySelectorAll('.reel')){
      if(!clip(node.dataset.id)){if(node.contains(activeReelWatch?.video))activeReelWatch.video.pause();node.remove();continue;}
      updateReelSocial(node.dataset.id);
    }
    const added=feedItems(id).filter(reel=>!root.querySelector('[data-id="'+CSS.escape(reel.id)+'"]'));
    if(added.length){
      const fragment=document.createElement('template');fragment.innerHTML=feed(id);
      for(const reel of added){
        const article=fragment.content.querySelector('[data-id="'+CSS.escape(reel.id)+'"]');
        root.append(article);observer?.observe(article);
      }
    }
    return;
  }
  if(route==='Inbox'&&$('#inboxMessage')){
    const draft=$('#inboxMessage input'), text=draft.value, focused=document.activeElement===draft;
    const pos=draft.selectionStart,end=draft.selectionEnd;
    render();
    const input=$('#inboxMessage input');
    if(input){input.value=text;if(focused){input.focus();input.setSelectionRange(pos,end);}}
    return;
  }
  if(document.activeElement?.id==='search'){$('#exploreResults').innerHTML=exploreResults();return;}
  render();
}
async function refreshShared(){
  const request=++sharedRead,scope=profileScope(),known=new Map(s.clips.filter(c=>c.shared).map(c=>[c.id,c.views.length]));
  let feed;
  try{feed=await (scope?shared.profile(scope):shared.feed());}
  catch(error){
    if(request!==sharedRead)return;
    if(sharedProfileStatus!=='ready'){sharedProfileStatus='failed';render();}
    throw error;
  }
  if(request!==sharedRead||scope!==profileScope())return;
  const {creators,videos}=feed;
  const wasReady=sharedProfileStatus==='ready';
  sharedProfileStatus='ready';loadedScope=scope;
  const signature=JSON.stringify([scope,creators,videos.map(v=>[v.id,v.title,v.captions])]);
  let changed=signature!==sharedSignature||!wasReady;
  const mapped=videos.map(v=>{
    const views=clip(v.id)?.views||[];
    if(applySharedViews(views,v.view_count,views.length===(known.get(v.id)??0)))changed=true;
    return {id:v.id,owner:v.creator_id,title:v.title,createdAt:Date.parse(v.created_at),captions:v.captions,
      shared:true,media:shared.media(v),likes:0,views};
  });
  sharedSignature=signature;
  s.channels=[...s.channels.filter(c=>!c.shared||(scope&&c.id!==scope)),...creators.map(c=>({
    id:c.id,name:c.name,coin:c.ticker,walletId:c.wallet,shared:true,avatar:shared.avatar(c),followers:[],following:0
  }))];
  s.clips=[...mapped,...s.clips.filter(c=>!c.shared||(scope&&c.owner!==scope))];
  if(changed)updateVisibleData();
  try{if(await refreshCommunity())updateVisibleData();}
  catch(error){
    communityFailed=true;
    if(path()[0]==='Moment')render();
    console.warn('Shared community data unavailable:',error.message);
  }
}

async function prepareProfilePhoto(file,x=.5,y=.5,zoom=1){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)
    throw Error('Choose a JPG, PNG, or WebP photo up to 10 MB.');
  const url=URL.createObjectURL(file);
  try{
    const photo=new Image();
    photo.src=url;
    await photo.decode();
    const side=Math.min(photo.naturalWidth,photo.naturalHeight)/zoom;
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=256;
    const context=canvas.getContext('2d');
    context.fillStyle='#2a3022';
    context.fillRect(0,0,256,256);
    context.drawImage(photo,(photo.naturalWidth-side)*x,(photo.naturalHeight-side)*y,side,side,0,0,256,256);
    return canvas;
  }catch{throw Error('This photo could not be opened. Choose another image.');}
  finally{URL.revokeObjectURL(url);}
}
async function saveProfilePhoto(form){
  const channel=self(), button=form.querySelector('button');
  if(!channel||button.disabled)return;
  if(shared&&!window.pulseWallet.signed()){go('Login/profile');$('dialog').close();return;}
  button.disabled=true;
  try{
    const canvas=await prepareProfilePhoto(form.elements.photo.files[0],Number(form.elements.x.value),Number(form.elements.y.value),Number(form.elements.zoom.value));
    if(shared){
      const photo=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
      if(!photo)throw Error('This photo could not be saved.');
      if(self()?.id!==channel.id)throw Error('Wallet changed. Sign in again.');
      await shared.setAvatar(photo);
      await refreshShared();
    }else{
      channel.avatar=canvas.toDataURL('image/jpeg',.88);
      save();
      render();
    }
    if(form.isConnected)$('dialog').close();
    toast('Profile photo updated.');
  }catch(error){formError(form,error.message||'Could not save your photo. Please retry.');}
  finally{button.disabled=false;}
}

async function readCaptions(form){
  const file=form.elements.captions?.files[0];
  if(!file)return null;
  if(file.size>65536)throw Error('Choose a WebVTT file up to 64 KiB.');
  const text=(await file.text()).replace(/^\uFEFF/,'');
  if(!/^WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(text))throw Error('Choose a valid WebVTT caption file.');
  return text;
}
async function submitShared(form, data) {
  if(!window.pulseWallet.signed() || !shared.userId){
    $('dialog').close();go('Login/profile');return;
  }
  const button = form.querySelector('button[type=submit],button.primary');
  if(button.disabled)return;
  button.disabled = true;
  try {
    if(form.id==='channel')await shared.create(data.get('name').trim());
    if(form.id==='launch')await shared.claim(data.get('symbol').trim().toUpperCase());
    if(form.id==='upload'){
      const file = form.elements.video.files[0];
      if(form.pendingFile !== file){
        form.pendingFile = file;
        form.dataset.videoId = crypto.randomUUID();
      }
      const caption=await readCaptions(form),status=form.querySelector('.uploadStatus');
      status.textContent='Uploading…';
      await shared.publish(file,data.get('title').trim(),form.dataset.videoId,caption,
        percent=>{status.textContent=percent===100?'Publishing video…':'Uploading · '+percent+'%';});
    }
    await refreshShared();
    $('dialog').close();
    if(form.id==='channel' && form.dataset.next==='create')return create();
    tab=0;go('Profile');
    if(form.id==='upload')toast('Video published.');
  }catch(error){
    const tickerTaken = form.id==='launch' && ['23505','23514'].includes(error.code);
    formError(form,tickerTaken?'That ticker is taken or reserved. Try another.':error.message || 'Could not save. Please retry.');
  }finally{button.disabled=false;}
}

document.addEventListener('submit',async e=>{let f=e.target;if(!f.id)return;e.preventDefault();let d=new FormData(f);if(f.id==='profilePhoto')return saveProfilePhoto(f);if(shared && ['channel','launch','upload'].includes(f.id))return submitShared(f,d);if(['reelComment','reelReport','inboxMessage'].includes(f.id))return submitSocial(f,d);if(f.id==='channel'){let name=d.get('name').trim();if(!name)return formError(f,'Enter a channel name.');if(!self())s.channels.push({id:'me',name,followers:[[Date.now(),0]],following:0});save();if(f.dataset.next==='create')return create();go('Profile');}
if(f.id==='launch'){let c=self(),symbol=d.get('symbol').toUpperCase();if(c.coin||s.channels.some(x=>x.coin===symbol))return formError(f,'This symbol is already taken.');Object.assign(c,{coin:symbol,supply:1000000,prices:[[Date.now(),1]]});toast('Coin symbol saved. Open the market to launch.');}
if(f.id==='upload'){let file=d.get('video'),title=d.get('title').trim();if(!title||!file.type.startsWith('video/'))return formError(f,'Enter a title and choose a video.');f.querySelector('button').disabled=true;try{if(file.size>50*1024*1024||!['video/mp4','video/webm','video/quicktime'].includes(file.type))throw Error('Choose an MP4, WebM or MOV file up to 50 MiB.');
const captions=await readCaptions(f);f.querySelector('.uploadStatus').textContent='Saving video…';
let db=await dbReady,id=crypto.randomUUID();await new Promise((ok,no)=>{let tx=db.transaction('videos','readwrite');tx.objectStore('videos').put(file,id);tx.oncomplete=ok;tx.onabort=no;});urls[id]=URL.createObjectURL(file);s.clips.push({id,owner:'me',title,captions,createdAt:Date.now(),likes:0,views:[[Date.now(),0]]});tab=0;go('Profile');toast('Video published.');}catch(error){f.querySelector('button').disabled=false;return formError(f,error.message||'Unable to save this video. Try a smaller file.');}}
save();$('dialog').close();render();});
window.addEventListener('hashchange',()=>{
  tab=0;
  if(shared&&(profileScope()!==loadedScope||path()[0]==='Inbox')){sharedProfileStatus='loading';loadShared();}
  render();window.scrollTo(0,0);
});render();
function loadShared(){
  return refreshShared().catch(()=>{
    if(path()[0]!=='Profile'||sharedProfileStatus==='ready')toast('Shared videos could not load. Refresh to retry.');
  });
}
if(shared){
  Promise.resolve(window.pulseWallet.restored).then(loadShared);
  window.addEventListener('pageshow',event=>{if(event.persisted)loadShared();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('dialog').open)loadShared();});
  setInterval(()=>{if(!document.hidden&&!$('dialog').open)loadShared();},30000);
}else hydrate().catch(()=>toast('This browser cannot store videos.'));
