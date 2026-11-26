'use strict';
const $=q=>document.querySelector(q), pages=['Login','Trending','Search','Clips','Trading','Profile'], day=86400000, fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2}), esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const epoch=Date.now(), names=['Tokyo Afterhours','Ocean Motion','Stereo Club','Pasta Studio'], titles=['When I text “almost there”','Trying to make it to Friday','When they hand me the aux','My definition of a little cheese'], tags=['NEON','WAVE','BEAT','PASTA'];
function hist(total,i){return [35,30,7,1,.7,.4,.15,0].map((d,j)=>[epoch-day*d,Math.round(total*[.02,.08,.22,.42,.48,.56,.86,1][j])]);}
function seed(){let channels=names.map((name,i)=>({id:String(i+1),name,coin:tags[i],prices:hist([4.8,3.2,2.1,1.6][i]*100,i).map(([t,v])=>[t,v/100]),supply:1000000,followers:hist(38000/(i+1),i),following:16+i}));return {channels,clips:titles.map((title,i)=>({id:String(i+1),owner:String(i+1),title,views:hist([248600,142800,86400,47200][i],i),likes:4200-i*800})),cash:10000,hold:{},closed:channels.map((c,i)=>({owner:c.id,t:epoch-day*.4,pnl:1200-i*310})),likes:[],saves:[],reposts:[]};}
let s=JSON.parse(localStorage.getItem('pulse-demo-v1')||'null')||seed(), period=0, category=2, metric=0, tab=0,side='buy', query='',observer, uploadDB, urls={},noticeTimer;
const punchlines=['Still looking for the station.','Monday has entered the chat.','Same song. Twelfth time.','Say when. Keep going. Keep going.'];
for(const c of s.clips){
  const index=Number(c.id)-1;
  if(c.owner===c.id && titles[index]) c.title=titles[index];
}
const priceText=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:6});
const save=()=>localStorage.setItem('pulse-demo-v1',JSON.stringify(s)),chan=id=>s.channels.find(c=>c.id===id), clip=id=>s.clips.find(c=>c.id===id), self=()=>chan('me'),last=a=>a.at(-1)?.[1]||0, cut=()=>period===3?-Infinity:Date.now()-[1,7,30][period]*day, pnl=id=>s.closed.filter(x=>x.owner===id&&x.t>=cut()).reduce((a,b)=>a+b.pnl,0);
function stats(a,start=cut()){let base=a.filter(x=>x[0]<=start).at(-1)?.[1]??(start===-Infinity?a[0]?.[1]||0:0),end=last(a);return {delta:end-base,pct:base?(end-base)*100/base:null};}
function growth(n){return n===null?'No baseline yet':(n>=0?'+':'')+fmt(n)+'%';}
function graph(a,mini=false,start=-Infinity){let prev=a.filter(x=>x[0]<=start).at(-1),points=a.filter(x=>x[0]>start);if(Number.isFinite(start))points.unshift([start,prev?.[1]||0]);if(!points.length)points=[[0,0]];let min=Math.min(...points.map(x=>x[1])),max=Math.max(...points.map(x=>x[1])),t=points[0][0],span=points.at(-1)[0]-t||1;let coords=points.map(([x,y])=>[(x-t)/span*200,48-(y-min)/(max-min||1)*43].join(',')).join(' ');return '<svg role="img" aria-label="Trend over time" class="'+(mini?'mini':'chart')+'" viewBox="0 0 200 52" preserveAspectRatio="none"><polygon points="0,52 '+coords+' 200,52" fill="#bfe95013"/><polyline points="'+coords+'" fill="none" stroke="#c9ef61" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';}
const link=(label,path,cl='link')=>'<button class="'+cl+'" data-go="'+esc(path)+'">'+label+'</button>',btn=(label,act,cl='')=>'<button class="'+cl+'" data-act="'+act+'">'+label+'</button>',image=c=>c.owner==='me'?'':"background-image:url(media/"+c.id+".jpg)",path=()=>decodeURIComponent(location.hash.slice(1)||'Clips').split('/'),go=p=>{if(path().join('/')===p)render();else location.hash=p;},heading=(name,sub,extra='')=>'<div class="headline"><div><h1>'+name+'</h1><p>'+sub+'</p></div>'+extra+'</div>', chip=(label,act,sel)=>btn(label,act,sel?'selected':'');
function cards(items){return items.length?'<div class="cards">'+items.map(c=>{let ch=chan(c.owner),g=stats(c.views,Date.now()-day);return '<article class="card"><button class="tile" aria-label="Play '+esc(c.title)+'" style="'+image(c)+'" data-go="Clips/'+c.id+'"><b>▷ '+fmt(last(c.views))+'</b></button><div class="details"><h3>'+link(esc(c.title),'Clips/'+c.id)+'</h3><small>'+link(esc(ch.name),'Profile/'+ch.id)+'</small><div class="metrics"><span class="positive">'+growth(g.pct)+'</span>'+graph(c.views,true,Date.now()-day)+'</div><small>+'+fmt(g.delta)+' views · 24h</small></div></article>';}).join('')+'</div>':'<p class="muted">No reels here yet.</p>';}
function market(c){return '<button class="market" data-go="Trading/'+c.id+'"><b class="coin">'+esc(c.coin[0])+'</b><span><strong>$'+esc(c.coin)+'</strong><small>'+esc(c.name)+'</small></span>'+'<b>tBNB</b></button>';}
function trending(){let items=s.clips.slice().sort((a,b)=>stats(b.views,Date.now()-day).delta-stats(a.views,Date.now()-day).delta),c=items[0];return heading('Trending','Discover the fastest-growing reels and creators.','<span class="muted">◷ &nbsp;24 hours</span>')+'<div class="heroGrid"><article class="hero" style="'+image(c)+'"><span class="tag">↗ &nbsp; TRENDING #1</span><div class="body">'+link(esc(chan(c.owner).name),'Profile/'+c.owner)+'<h2>'+esc(c.title)+'</h2><div class="row">'+link('▶ &nbsp; Play reel','Clips/'+c.id,'primary')+'<span>◉ '+fmt(last(c.views))+' views</span></div></div></article><section class="panel"><h2>Creator coins</h2>'+s.channels.filter(c=>c.coin).slice(0,4).map(market).join('')+'</section></div><div class="sectionhead"><h2>Trending reels</h2>'+link('View leaderboard','Search/Leaderboard')+'</div>'+cards(items);}
function viewTabs(label, options, selected, action){
  return '<div class="viewTabs" role="group" aria-label="'+label+'">'+options.map(([id,name])=>
    '<button type="button" data-act="'+action+':'+id+'" aria-pressed="'+(id===selected)+'">'+name+'</button>'
  ).join('')+'</div>';
}
function reelThumb(reel, className=''){
  if(!reel)return '';
  const preview=reel.owner==='me'&&urls[reel.id]
    ? '<video src="'+esc(urls[reel.id])+'" muted playsinline preload="metadata" aria-hidden="true"></video>' : '';
  return '<button type="button" class="reelThumb '+className+'" data-go="Clips/'+esc(reel.id)+'" aria-label="Play '+esc(reel.title)+'" style="'+image(reel)+'">'+preview+'<span>▷ '+fmt(last(reel.views))+'</span></button>';
}
let exploreTab='all';
function exploreResults(){
  const q=query.trim().toLowerCase(), matches=(...values)=>values.some(value=>String(value||'').toLowerCase().includes(q));
  const reels=s.clips.filter(c=>matches(c.title,chan(c.owner)?.name,chan(c.owner)?.coin? '$'+chan(c.owner).coin : ''))
    .sort((a,b)=>stats(b.views,Date.now()-day).delta-stats(a.views,Date.now()-day).delta);
  const channels=s.channels.filter(c=>matches(c.name,c.coin&&'$'+c.coin));
  const groups=[
    ['reels', q?'Reels':'Trending reels',reels.map(reel=>{
      const owner=chan(reel.owner);
      return '<article class="exploreRow">'+link('<strong>'+esc(reel.title)+'</strong><small>'+esc(owner?.name||'')+' · '+fmt(last(reel.views))+' views</small>','Clips/'+reel.id,'exploreTitle')+reelThumb(reel)+'</article>';
    })],
    ['channels','Channels',channels.map(c=>'<div class="exploreRow">'+link('<strong>'+esc(c.name)+'</strong><small>'+fmt(last(c.followers))+' followers</small>','Profile/'+c.id,'exploreTitle')+'</div>')],
    ['traders','Traders',channels.filter(c=>s.closed.some(trade=>trade.owner===c.id)||c.id==='me'&&Object.keys(s.hold).length).map(c=>'<div class="exploreRow">'+link(esc(c.name),'Profile/'+c.id,'exploreTitle')+'</div>')],
    ['coins','Creator coins',channels.filter(c=>c.coin).map(c=>'<div class="exploreRow">'+link('<strong>$'+esc(c.coin)+'</strong><small>'+esc(c.name)+'</small>','Trading/'+c.id,'exploreTitle')+'</div>')]
  ];
  const visible=groups.filter(([id,,rows])=>rows.length&&(exploreTab==='all'||exploreTab===id));
  return visible.length ? visible.map(([,title,rows])=>'<section><h2>'+title+'</h2>'+rows.join('')+'</section>').join('')
    : '<p class="emptyView">'+(q?'No results found.':'Nothing to explore here yet.')+'</p>';
}
function search(section){
  const showLeaderboard=section==='Leaderboard';
  const tabs=viewTabs('Explore categories',[
    ['all','For you'],['reels','Reels'],['channels','Channels'],['traders','Traders'],['coins','Coins'],['leaderboard','Leaderboard']
  ],showLeaderboard?'leaderboard':exploreTab,'explore');
  const content=showLeaderboard?ranks():
    '<label class="exploreField"><span aria-hidden="true">⌕</span><input id="search" type="search" aria-label="Search Pulse" placeholder="Search reels, channels, traders, or coins" value="'+esc(query)+'"></label>'+
    '<div id="exploreResults">'+exploreResults()+'</div>';
  return '<div class="discovery"><h1>Explore</h1>'+tabs+content+'</div>';
}
function reelActions(c,ch){
  function control(label,symbol,act,style='',pressed=null){
    const state=pressed===null?'':' aria-pressed="'+pressed+'"';
    return '<button type="button" class="railAction '+style+'" data-act="'+esc(act)+'"'+state+'><span aria-hidden="true">'+symbol+'</span>'+label+'</button>';
  }
  const actions=[];
  if(ch.coin){
    actions.push(control('Trade','↔','reelTrade:'+c.id,'reelTrade'));
  }
  for(const [key,label,symbol] of [['likes','Like','♡'],['saves','Save','☆'],['reposts','Repost','↻']]){
    actions.push(control(label,symbol,'toggle:'+key+':'+c.id,'',s[key].includes(c.id)));
  }
  actions.push(control('Share','↗','reelShare:'+c.id));
  return '<div class="reelRail" role="group" aria-label="Reel actions">'+actions.join('')+'</div>';
}
function feed(id){
  const idx=Math.max(0,s.clips.findIndex(c=>c.id===id));
  const items=[...s.clips.slice(idx),...s.clips.slice(0,idx)];
  return '<div class="feed" aria-label="Reels">'+items.map(c=>{
    const ch=chan(c.owner),seeded=c.owner===c.id;
    const media=c.owner==='me'?'src="'+(urls[c.id]||'')+'"':'poster="media/'+c.id+'.jpg" src="media/'+c.id+'.mp4"';
    const backdrop=seeded?' style="--reel-poster:url(media/'+c.id+'.jpg)"':'';
    const caption=seeded?'<div class="memeCaption"><strong>'+esc(c.title)+'</strong><strong>'+esc(punchlines[Number(c.id)-1])+'</strong></div>':'';
    const coin=ch.coin?link('$'+esc(ch.coin),'Trading/'+ch.id,'coinPill'):'';
    return '<article class="reel" data-id="'+c.id+'"'+backdrop+'><video playsinline muted loop controls '+media+'></video>'+caption+
      '<button type="button" class="momentGesture" aria-label="Hold to create Moment Coin" title="Hold to create Moment Coin"></button>'+
      '<div class="controls"><div class="byline">'+link(esc(ch.name),'Profile/'+ch.id)+coin+'</div><h3>'+esc(c.title)+'</h3></div>'+reelActions(c,ch)+'</article>';
  }).join('')+'</div>';
}
function observe(){observer?.disconnect();const root=$('.feed');if(!root)return;observer=new IntersectionObserver(entries=>entries.forEach(e=>{let v=e.target.querySelector('video');if(e.isIntersecting){v.play().catch(()=>{});let c=clip(e.target.dataset.id);c.views.push([Date.now(),last(c.views)+1]);save();}else v.pause();}),{root,threshold:.65});root.querySelectorAll('article').forEach(el=>observer.observe(el));}
let marketGroup='all';
function marketHome(){
  const visible=s.channels.filter(c=>c.coin && (marketGroup==='all'||s.watchlist?.includes(c.id)));
  return '<div class="marketHome"><div class="balanceBlock"><div><small>BSC TESTNET · CHAIN 97</small><h1>Creator coins</h1><p>Choose a creator coin to trade with tBNB.</p></div></div>'+
  '<h2>Creator market</h2><div class="marketTabs">'+[['all','All coins'],['saved','Starred']].map(([k,v])=>chip(v,'group:'+k,k===marketGroup)).join('')+'</div>'+
  visible.map(c=>{const saved=s.watchlist?.includes(c.id);
    return '<div class="assetLine"><button class="assetOpen" data-go="Trading/'+c.id+'"><span class="assetArt" style="'+(c.id!=='me'?'background-image:url(media/'+c.id+'.jpg)':'')+'">'+esc(c.coin[0])+'</span><span class="assetName"><b>$'+esc(c.coin)+'</b><small>' +esc(c.name)+'</small></span><span class="assetPrice"><b>tBNB</b><small>BSC Testnet</small></span></button><button class="star" data-act="watch:'+c.id+'" aria-pressed="'+!!saved+'" aria-label="Starred '+esc(c.coin)+'">'+(saved?'★':'☆')+'</button></div>';
  }).join('')+(visible.length?'':'<p class="emptyMarket">'+(marketGroup==='saved'?'Star a coin to add it to your watchlist.':'No creator coins available.')+'</p>')+'</div>';
}
function trade(id){
  if(!id)return marketHome();
  const c=s.channels.find(x=>x.coin&&x.id===id);
  if(!c)return marketHome();
  return heading('Trading','BSC Testnet · tBNB',link('All markets','Trading',''))+
    '<div class="layout"><section class="panel"><h2>'+esc(c.name)+'</h2>'+link('View profile','Profile/'+c.id)+'<p>Channel coin $'+esc(c.coin)+'</p></section><section class="panel chainPanel" id="chainPanel"></section></div>'+
    '<h2 class="sectionhead">Latest reels</h2>'+cards(s.clips.filter(x=>x.owner===c.id).slice().reverse());
}
function paintWallet(){
  if($('#holdings'))window.pulseWallet.portfolio($('#holdings'),s.channels);
  const sheet=$('#reelTicket');if(sheet&&$('dialog').open)window.pulseWallet.panel(sheet,chan(sheet.dataset.owner));
  const root=$('#chainPanel');if(root)window.pulseWallet.panel(root,chan(path()[1]));
}
window.addEventListener('pulse-wallet-change',()=>{if(path()[0]==='Login'&&!window.pulseWallet.signed()&&$('#walletLogin button:disabled'))return;if($('#reelTicket')&&$('dialog').open){paintWallet();return;}render();});
window.addEventListener('pulse-creator-linked',event=>{const c=self();if(c&&!c.walletId){c.walletId=event.detail;save();paintWallet();}});
const rankMetrics=[
  [['gained','Views gained'],['growth','View growth']],
  [['views','Reel views gained'],['followers','Total followers'],['gained','New followers'],['growth','Follower growth']],
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
    const channelViews=mode==='views'?s.clips.filter(c=>c.owner===channel.id).reduce((sum,clip)=>sum+stats(clip.views,since).delta,0):null;
    const value=mode==='views'?channelViews:profitability?(positionRanks?item.pnl:pnl(channel.id)):mode==='growth'?pct:mode==='followers'?last(history):delta;
    const score=value===null?'No baseline':profitability?(value>0?'+':'')+fmt(value)+' THB':mode==='growth'?growth(value):fmt(value)+(clipRanks||mode==='views'?' views':' followers');
    return {channel,reel,value,score};
  }).filter(Boolean).sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity));
  const myIndex=category===2?rows.findIndex(row=>row.channel.id==='me'):-1;
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
function profile(id='me'){
  const channel=chan(id), mine=id==='me';
  if(!channel&&!mine)return '<h1>Profile</h1><p class="emptyView">Channel not found.</p>';
  const owned=s.clips.filter(reel=>reel.owner===id);
  const items=mine&&tab?s.clips.filter(reel=>s[['','reposts','likes','saves'][tab]].includes(reel.id)):owned;
  const name=channel?.name||'My profile', handle=channel?.name.toLowerCase().replaceAll(/[^\p{L}\p{N}]+/gu,'_').replace(/^_|_$/g,'');
  const likes=owned.reduce((total,reel)=>total+reel.likes+Number(s.likes.includes(reel.id)),0);
  const action=!channel?btn('Create channel','channel','primary'):channel.coin?link('Trade $'+esc(channel.coin),'Trading/'+channel.id,'primary'):mine?btn('Launch channel coin','launch','primary'):'';
  const avatar=id!=='me'&&owned.length?' style="'+image(owned[0])+'"':'';
  const stats=[['Following',channel?.following||0],['Followers',last(channel?.followers||[])],['Likes',likes]];
  return '<section class="creatorProfile"><div class="creatorIntro"><div class="creatorDetails"><h1>'+esc(name)+'</h1>'+
    (handle?'<p>@'+esc(handle)+'</p>':'')+'<dl class="creatorStats">'+stats.map(([label,count])=>'<div><dt>'+label+'</dt><dd>'+fmt(count)+'</dd></div>').join('')+'</dl></div><div class="creatorAvatar" aria-hidden="true"'+avatar+'>'+(avatar?'':esc(name[0]))+'</div></div>'+
    '<div class="creatorActions">'+action+(mine&&channel?btn('Create reel','create',''):'')+'</div>'+
    (mine?'<section class="panel portfolio" id="holdings"></section>':'')+
    (mine?viewTabs('Profile reels',[[0,'Posts'],[1,'Reposts'],[2,'Liked'],[3,'Saved']],tab,'tab'):'<h2 class="profilePosts">Posts</h2>')+
    (items.length?'<div class="creatorGrid">'+items.slice().reverse().map(reel=>reelThumb(reel)).join('')+'</div>':'<p class="emptyView">No reels here yet.</p>')+'</section>';
}
const dockItems=[
  ['Trading','Trade','M3 17l6-6 4 3 8-10 M15 4h6v6'],
  ['Search','Explore','M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M15 15l6 6'],
  ['Clips','Reels','M8 4l12 8-12 8z'],
  ['Profile','Profile','M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2']
];
function loginScreen(){
  return '<section class="loginCard"><div class="loginArt" aria-hidden="true"></div><div class="loginBody"><h1>Wallet sign-in</h1><p>Use your wallet to trade creator coins on BSC Testnet.</p><div id="walletLogin"></div>'+link('Browse Reels','Clips','guestLink')+'</div></section>';
}
function render(){
  let [p,id]=path();
  if(p==='Leaderboard'){
    p='Search';id='Leaderboard';
    history.replaceState(null,'','#Search/Leaderboard');
  }
  if(!pages.includes(p))p='Clips';
  document.body.classList.toggle('reelsPage',p==='Clips');
  $('.accountLink').textContent=window.pulseWallet.signed()?'Wallet':'Sign in';
  $('nav').innerHTML=dockItems.map(([route,label,icon])=>{
    if(route==='Clips'&&p==='Clips')return '<button type="button" class="dockItem center active" data-act="create"><span class="dockIcon" aria-hidden="true">＋</span>Create</button>';
    const active=route===p && (route!=='Profile'||!id||id==='me');
    return '<a href="#'+route+'" class="dockItem '+(route==='Clips'?'center ':'')+(active?'active':'')+'" '+(active?'aria-current="page"':'')+'><span class="dockIcon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+icon+'"/></svg></span>'+label+'</a>';
  }).join('');
  $('main').innerHTML=({Login:loginScreen,Trending:trending,Search:search,Clips:feed,Trading:trade,Profile:profile})[p](id);observe();paintWallet();
  if(p==='Login')window.pulseWallet.loginPage($('#walletLogin'),()=>go(id==='portfolio'?'Profile':id&&chan(id)?.coin?'Trading/'+id:'Clips'));
}
function modal(html){$('#form').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
function openReelTrade(reel){
  const creator=chan(reel?.owner);
  if(!creator?.coin)return;
  modal('<div class="reelTradeHeading"><small>CREATOR MARKET</small><strong>'+esc(creator.name)+'</strong></div>'+
    '<div id="reelTicket" class="chainPanel" data-owner="'+esc(creator.id)+'"></div>');
  paintWallet();
}
async function shareReel(reel){
  if(!reel)return;
  const url=new URL(location.href);
  url.hash='Clips/'+encodeURIComponent(reel.id);
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
      }else toast('This reel is only available in the browser that uploaded it.');
      return;
    }
    if(navigator.share){
      await navigator.share({title:reel.title,url:url.href});return;
    }
  }catch(error){if(error.name==='AbortError')return;}
  if(reel.owner==='me')return toast('Unable to share this video.');
  try{
    await navigator.clipboard.writeText(url.href);toast('Reel link copied');
  }catch{
    modal('<label>Share reel<input readonly value="'+esc(url.href)+'"></label>');
    $('#form input').select();
  }
}
function momentTime(seconds){
  return Math.floor(seconds/60)+':'+(seconds%60).toFixed(2).padStart(5,'0');
}
function openMoment(reel,source){
  if(!reel||!source?.getAttribute('src'))return toast('This clip is unavailable.');
  const existing=s.moments?.[reel.id];
  const resume=!source.paused;
  source.pause();
  const start=existing?.time??source.currentTime;
  modal('<section class="momentSheet"><h2>'+(existing?'Moment Coin':'Create Moment Coin')+'</h2>'+
    '<p class="momentSource">'+esc(reel.title)+' · '+esc(chan(reel.owner).name)+'</p>'+
    '<video class="momentPreview" muted playsinline preload="auto" src="'+esc(source.getAttribute('src'))+'" aria-label="Selected frame"></video>'+
    (existing?'<h3>'+esc(existing.name)+'</h3><p>'+esc(existing.description)+'</p><p>Frame '+momentTime(existing.time)+'</p><small>Saved on this device · Demo</small>':
      '<form id="momentLaunch"><label class="momentTimeline">Choose a frame <output></output><input type="range" min="0" step=".01" value="0" disabled></label>'+
      '<label>Coin name<input name="name" maxlength="60" required></label>'+
      '<label>Description<textarea name="description" maxlength="220" rows="2" required></textarea></label>'+
      '<button type="submit" class="primary" disabled>Create demo coin</button><small>Saved on this device</small></form>')+
    '<p class="momentStatus" role="status">Loading clip…</p></section>');
  const dialog=$('dialog'), preview=$('.momentPreview'), form=$('#momentLaunch'), status=$('.momentStatus');
  const track=form?.querySelector('input[type=range]'), submit=form?.querySelector('button');
  function seek(){
    const time=track?Number(track.value):Math.min(start,preview.duration);
    if(track)form.querySelector('output').textContent=momentTime(time)+' / '+momentTime(preview.duration);
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
    status.textContent='';if(submit)submit.disabled=false;
  };
  preview.addEventListener('loadeddata',ready);
  preview.addEventListener('seeked',ready);
  preview.addEventListener('seeking',()=>{if(submit)submit.disabled=true;});
  preview.addEventListener('error',()=>{status.textContent='Unable to load this clip.';if(submit)submit.disabled=true;});
  if(form)form.addEventListener('submit',event=>{
    event.preventDefault();
    event.stopPropagation();
    if(submit.disabled)return;
    const name=form.elements.name.value.trim(), description=form.elements.description.value.trim();
    if(!name||!description){status.textContent='Enter a coin name and description.';return;}
    const latest=JSON.parse(localStorage.getItem('pulse-demo-v1')||'null');
    s.moments={...s.moments,...latest?.moments};
    if(s.moments[reel.id]){
      status.textContent='This reel already has a Moment Coin. Reopen the clip editor to see it.';return;
    }
    s.moments[reel.id]={name,description,time:Number(track.value),ownerId:reel.owner,clipId:reel.id};
    try{save();}catch{delete s.moments[reel.id];status.textContent='Could not save this Moment Coin.';return;}
    dialog.close();toast('Created '+name+' · Demo Moment Coin');
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
function create(){if(!self())return channelForm('create');modal('<h2>Create reel</h2><form id="upload"><label>Reel title<input name="title" required maxlength="90"></label><label>Video file<input type="file" name="video" required accept="video/*"></label><button class="primary">Publish reel</button></form>');}
function action(str,el){let [k,v,id]=str.split(':');if(k==='reelShare')return shareReel(clip(v));if(k==='reelTrade')return openReelTrade(clip(v));if(k==='explore'){
  if(v==='leaderboard')return go('Search/Leaderboard');
  exploreTab=v;return go('Search');
}if(k==='group'){marketGroup=v;return render();}

if(k==='watch'){const list=s.watchlist||[];s.watchlist=list.includes(v)?list.filter(x=>x!==v):[...list,v];save();return render();}
if(k==='create')return create();if(k==='channel')return channelForm('profile');if(k==='launch')return modal('<h2>Launch Channel coin</h2><p>Every reel on your channel will link to this coin.</p><form id="launch"><label>Coin symbol (2–8 letters, A–Z)<input required pattern="[A-Za-z]{2,8}" name="symbol"></label><p>Choose a symbol, then open the market to register your coin with your wallet on BSC Testnet.</p><button class="primary">Confirm launch</button></form>');if(k==='toggle'){s[v]=s[v].includes(id)?s[v].filter(x=>x!==id):[...s[v],id];save();el.classList.toggle('selected',s[v].includes(id));el.setAttribute('aria-pressed',String(s[v].includes(id)));return;}if(k==='category'){category=+v;metric=0;}if(k==='metric')metric=+v;if(k==='range')period=+v;if(k==='tab')tab=+v;if(k==='side')side=v;render();}
document.addEventListener('click',e=>{
  const center=e.target.closest('.momentGesture');
  if(center){
    const reel=center.closest('.reel'), video=reel.querySelector('video');
    if(e.detail===0)openMoment(clip(reel.dataset.id),video);
    else if(!$('dialog').open){if(video.paused)video.play().catch(()=>{});else video.pause();}
    return;
  }
  let el=e.target.closest('[data-go],[data-act]');if(!el)return;if(el.dataset.go)go(el.dataset.go);else action(el.dataset.act,el);});
document.addEventListener('change',e=>{if(e.target.id==='token')go('Trading/'+e.target.value);});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;$('#exploreResults').innerHTML=exploreResults();}});
const dbReady=new Promise((resolve,reject)=>{let req=indexedDB.open('pulse-clips',1);req.onupgradeneeded=()=>req.result.createObjectStore('videos');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);});
async function hydrate(){let db=await dbReady;let req=db.transaction('videos').objectStore('videos').openCursor();req.onsuccess=()=>{let cur=req.result;if(cur){urls[cur.key]=URL.createObjectURL(cur.value);cur.continue();}else if(['Clips','Profile','Search'].includes(path()[0]))render();};}
document.addEventListener('submit',async e=>{let f=e.target;if(!f.id)return;e.preventDefault();let d=new FormData(f);if(f.id==='channel'){let name=d.get('name').trim();if(!name)return toast('Enter a channel name.');if(!self())s.channels.push({id:'me',name,followers:[[Date.now(),0]],following:0});save();if(f.dataset.next==='create')return create();go('Profile');}
if(f.id==='launch'){let c=self(),symbol=d.get('symbol').toUpperCase();if(c.coin||s.channels.some(x=>x.coin===symbol))return toast('This symbol is already taken.');Object.assign(c,{coin:symbol,supply:1000000,prices:[[Date.now(),1]]});toast('Coin symbol saved. Open the market to launch.');}
if(f.id==='upload'){let file=d.get('video'),title=d.get('title').trim();if(!title||!file.type.startsWith('video/'))return toast('Enter a title and choose a video.');f.querySelector('button').disabled=true;try{let db=await dbReady,id=crypto.randomUUID();await new Promise((ok,no)=>{let tx=db.transaction('videos','readwrite');tx.objectStore('videos').put(file,id);tx.oncomplete=ok;tx.onabort=no;});urls[id]=URL.createObjectURL(file);s.clips.push({id,owner:'me',title,likes:0,views:[[Date.now(),0]]});tab=0;go('Profile');toast('Reel published.');}catch{f.querySelector('button').disabled=false;return toast('Unable to save this video. Try a smaller file.');}}
save();$('dialog').close();render();});
window.addEventListener('hashchange',()=>{tab=0;render();window.scrollTo(0,0);});render();hydrate().catch(()=>toast('This browser cannot store videos.'));
