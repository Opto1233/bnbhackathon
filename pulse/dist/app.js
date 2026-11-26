'use strict';
const $=q=>document.querySelector(q), pages=['Login','Trending','Search','Clips','Trading','Leaderboard','Profile'], day=86400000, periods=['24 hours','7 days','30 days','All time'], fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2}), esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const epoch=Date.now(), names=['Tokyo Afterhours','Ocean Motion','Stereo Club','Pasta Studio'], titles=['When I text “almost there”','Trying to make it to Friday','When they hand me the aux','My definition of a little cheese'], tags=['NEON','WAVE','BEAT','PASTA'];
function hist(total,i){return [35,30,7,1,.7,.4,.15,0].map((d,j)=>[epoch-day*d,Math.round(total*[.02,.08,.22,.42,.48,.56,.86,1][j])]);}
function seed(){let channels=names.map((name,i)=>({id:String(i+1),name,coin:tags[i],prices:hist([4.8,3.2,2.1,1.6][i]*100,i).map(([t,v])=>[t,v/100]),supply:1000000,followers:hist(38000/(i+1),i),following:16+i}));return {channels,clips:titles.map((title,i)=>({id:String(i+1),owner:String(i+1),title,views:hist([248600,142800,86400,47200][i],i),likes:4200-i*800})),cash:10000,hold:{},closed:channels.map((c,i)=>({owner:c.id,t:epoch-day*.4,pnl:1200-i*310})),likes:[],saves:[],reposts:[]};}
let s=JSON.parse(localStorage.getItem('pulse-demo-v1')||'null')||seed(), period=0, category=3, metric=0, tab=0,side='buy', query='',observer, uploadDB, urls={},noticeTimer;
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
const link=(label,path,cl='link')=>'<button class="'+cl+'" data-go="'+esc(path)+'">'+label+'</button>',btn=(label,act,cl='')=>'<button class="'+cl+'" data-act="'+act+'">'+label+'</button>',image=c=>c.owner==='me'?'':"background-image:url(media/"+c.id+".jpg)",path=()=>decodeURIComponent(location.hash.slice(1)||'Clips').split('/'),go=p=>{if(path().join('/')===p)render();else location.hash=p;},heading=(name,sub,extra='')=>'<div class="headline"><div><h1>'+name+'</h1><p>'+sub+'</p></div>'+extra+'</div>', chip=(label,act,sel)=>btn(label,act,sel?'selected':''),ranges=()=>'<div class="filters">'+periods.map((p,i)=>chip(p,'range:'+i,i===period)).join('')+'</div>';
function cards(items){return items.length?'<div class="cards">'+items.map(c=>{let ch=chan(c.owner),g=stats(c.views,Date.now()-day);return '<article class="card"><button class="tile" aria-label="Play '+esc(c.title)+'" style="'+image(c)+'" data-go="Clips/'+c.id+'"><b>▷ '+fmt(last(c.views))+'</b></button><div class="details"><h3>'+link(esc(c.title),'Clips/'+c.id)+'</h3><small>'+link(esc(ch.name),'Profile/'+ch.id)+'</small><div class="metrics"><span class="positive">'+growth(g.pct)+'</span>'+graph(c.views,true,Date.now()-day)+'</div><small>+'+fmt(g.delta)+' views · 24h</small></div></article>';}).join('')+'</div>':'<p class="muted">No reels here yet.</p>';}
function market(c){return '<button class="market" data-go="Trading/'+c.id+'"><b class="coin">'+esc(c.coin[0])+'</b><span><strong>$'+esc(c.coin)+'</strong><small>'+esc(c.name)+'</small></span>'+'<b>tBNB</b></button>';}
function trending(){let items=s.clips.slice().sort((a,b)=>stats(b.views,Date.now()-day).delta-stats(a.views,Date.now()-day).delta),c=items[0];return heading('Trending','Discover the fastest-growing reels and creators.','<span class="muted">◷ &nbsp;24 hours</span>')+'<div class="heroGrid"><article class="hero" style="'+image(c)+'"><span class="tag">↗ &nbsp; TRENDING #1</span><div class="body">'+link(esc(chan(c.owner).name),'Profile/'+c.owner)+'<h2>'+esc(c.title)+'</h2><div class="row">'+link('▶ &nbsp; Play reel','Clips/'+c.id,'primary')+'<span>◉ '+fmt(last(c.views))+' views</span></div></div></article><section class="panel"><h2>Creator coins</h2>'+s.channels.filter(c=>c.coin).slice(0,4).map(market).join('')+'</section></div><div class="sectionhead"><h2>Trending reels</h2>'+link('View leaderboard','Leaderboard')+'</div>'+cards(items);}
function search(){let q=query.toLowerCase(),filter=(a,k)=>a.filter(x=>String(x[k]||'').toLowerCase().includes(q));return heading('Search','Find reels, channels, traders, and creator coins.')+'<input id="search" aria-label="Search" placeholder="Search reels, channels, or coins" value="'+esc(query)+'"><h2 class="sectionhead">Reels</h2>'+cards(filter(s.clips,'title'))+[['Channels',s.channels,'name','Profile'],['Trader',s.channels.filter(c=>s.closed.some(x=>x.owner===c.id)||c.id==='me'&&Object.keys(s.hold).length),'name','Profile'],['Coins',s.channels.filter(c=>c.coin),'coin','Trading']].map(([n,a,k,d])=>'<h2 class="sectionhead">'+n+'</h2><div class="row">'+(filter(a,k).map(c=>link(esc(c[k]),d+'/'+c.id,'')).join('')||'No results')+'</div>').join('');}
function reelActions(c,ch){
  function control(label,symbol,act,style='',pressed=null){
    const state=pressed===null?'':' aria-pressed="'+pressed+'"';
    return '<button type="button" class="railAction '+style+'" data-act="'+esc(act)+'"'+state+'><span aria-hidden="true">'+symbol+'</span>'+label+'</button>';
  }
  const actions=[];
  if(ch.coin){
    actions.push(control('Buy','＋','reelTrade:buy:'+c.id,'tradeBuy'));
    actions.push(control('Sell','−','reelTrade:sell:'+c.id,'tradeSell'));
  }
  for(const [key,label,symbol] of [['likes','Like','♡'],['saves','Save','☆'],['reposts','Repost','↻']]){
    actions.push(control(label,symbol,'toggle:'+key+':'+c.id,'',s[key].includes(c.id)));
  }
  if(c.owner!=='me')actions.push(control('Link','↗','reelLink:'+c.id));
  return '<div class="reelRail" role="group" aria-label="Reel actions">'+actions.join('')+'</div>';
}
function feed(id){let idx=Math.max(0,s.clips.findIndex(c=>c.id===id)),items=[...s.clips.slice(idx),...s.clips.slice(0,idx)];return heading('Reels','Swipe up for the next reel')+'<div class="feed">'+items.map(c=>{let ch=chan(c.owner);return '<article class="reel" data-id="'+c.id+'"><video playsinline muted loop controls '+(c.owner==='me'?'src="'+(urls[c.id]||'')+'"':'poster="media/'+c.id+'.jpg" src="media/'+c.id+'.mp4"')+'></video>'+(c.owner===c.id?'<div class="memeCaption"><strong>'+esc(c.title)+'</strong><strong>'+esc(punchlines[Number(c.id)-1])+'</strong></div>':'')+'<div class="controls">'+link(esc(ch.name),'Profile/'+ch.id)+'<h3>'+esc(c.title)+'</h3></div>'+reelActions(c,ch)+'</article>';}).join('')+'</div>';}
function observe(){observer?.disconnect();const root=$('.feed');if(!root)return;observer=new IntersectionObserver(entries=>entries.forEach(e=>{let v=e.target.querySelector('video');if(e.isIntersecting){v.play().catch(()=>{});let c=clip(e.target.dataset.id);c.views.push([Date.now(),last(c.views)+1]);save();}else v.pause();}),{root,threshold:.65});root.querySelectorAll('article').forEach(el=>observer.observe(el));}
let marketGroup='all';
function marketHome(){
  const visible=s.channels.filter(c=>c.coin && (marketGroup==='all'||s.watchlist?.includes(c.id)));
  return '<div class="marketHome"><div class="balanceBlock"><div><small>BSC TESTNET · CHAIN 97</small><h1>Creator coins</h1><p>Choose a creator coin to trade with tBNB.</p></div></div>'+
  '<section class="panel portfolio" id="holdings"></section><h2>Creator market</h2><div class="marketTabs">'+[['all','All coins'],['saved','Starred']].map(([k,v])=>chip(v,'group:'+k,k===marketGroup)).join('')+'</div>'+
  visible.map(c=>{const saved=s.watchlist?.includes(c.id);
    return '<div class="assetLine"><button class="assetOpen" data-go="Trading/'+c.id+'"><span class="assetArt" style="'+(c.id!=='me'?'background-image:url(media/'+c.id+'.jpg)':'')+'">'+esc(c.coin[0])+'</span><span class="assetName"><b>$'+esc(c.coin)+'</b><small>' +esc(c.name)+'</small></span><span class="assetPrice"><b>tBNB</b><small>BSC Testnet</small></span></button><button class="star" data-act="watch:'+c.id+'" aria-pressed="'+!!saved+'" aria-label="Starred '+esc(c.coin)+'">'+(saved?'★':'☆')+'</button></div>';
  }).join('')+(visible.length?'':'<p class="emptyMarket">'+(marketGroup==='saved'?'Star a coin to add it to your watchlist.':'No coins in your portfolio.')+'</p>')+'</div>';
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
  const sheet=$('#reelTicket');if(sheet&&$('dialog').open)window.pulseWallet.panel(sheet,chan(sheet.dataset.owner),sheet.dataset.side);
  const root=$('#chainPanel');if(root)window.pulseWallet.panel(root,chan(path()[1]));
}
window.addEventListener('pulse-wallet-change',()=>{if(path()[0]==='Login'&&!window.pulseWallet.signed()&&$('#walletLogin button:disabled'))return;if($('#reelTicket')&&$('dialog').open){paintWallet();return;}render();});
window.addEventListener('pulse-creator-linked',event=>{const c=self();if(c&&!c.walletId){c.walletId=event.detail;save();paintWallet();}});
const criteria=[['Views gained','View growth (%)'],['Total followers · current','Net new followers','Follower growth (%)'],['Realized PnL · demo data (THB)'],['Views gained across a channel’s reels']];
function ranks(){let a=category===0?s.clips:(category===1||category===3)?s.channels:s.channels.filter(c=>s.closed.some(x=>x.owner===c.id&&x.t>=cut())),isPct=category===0&&metric===1||category===1&&metric===2,rows=a.map(c=>{let hist=category===0?c.views:c.followers,g=stats(hist),v=category===3?s.clips.filter(x=>x.owner===c.id).reduce((sum,x)=>sum+stats(x.views).delta,0):category===2?pnl(c.id):isPct?g.pct:category===1&&metric===0?last(hist):g.delta;return {c,hist,g,v};}).sort((a,b)=>(b.v??-Infinity)-(a.v??-Infinity));return heading('Leaderboard','Rankings for reels, channels, and traders.')+'<div class="filters">'+[[3,'Top Users'],[2,'Top Gainers'],[1,'Top Followers'],[0,'Reels']].map(([i,n])=>chip(n,'category:'+i,i===category)).join('')+'</div>'+ranges()+'<div class="filters">'+criteria[category].map((n,i)=>chip(n,'metric:'+i,i===metric)).join('')+'</div><section class="panel"><h2>'+criteria[category][metric]+'</h2><small>'+periods[period]+'</small>'+rows.map(({c,hist,g,v},i)=>'<div class="rank"><b>'+(v===null?'–':i+1)+'</b>'+link(esc(c.title||c.name),(category===0?'Clips/':'Profile/')+c.id)+(category===0?graph(hist,true,cut()):'<span></span>')+'<strong>'+ (v===null?fmt(g.delta)+' · No baseline yet':fmt(v)+(category===2?' THB':isPct?'%':(category===0||category===3)?' views':' followers'))+'</strong></div>').join('')+'</section>';}
function profile(id='me'){let c=chan(id),owned=s.clips.filter(x=>x.owner===id),mine=id==='me';let items=tab===0?owned:mine?s.clips.filter(x=>s[['','reposts','likes','saves'][tab]].includes(x.id)):[];return heading('Profile',esc(c?.name||'My profile'),!c?btn('Create channel','channel','primary'):c.coin?link('$'+esc(c.coin)+' · View market','Trading/'+c.id,'primary'):mine?btn('Launch Channel coin','launch','primary'):'')+ranges()+'<div class="row">'+[['Followers',last(c?.followers||[])],['Following',c?.following||0],['Likes received',owned.reduce((n,x)=>n+x.likes+Number(s.likes.includes(x.id)),0)],['Realized PnL demo (THB)',pnl(id)]].map(([n,v])=>'<div class="stat"><small>'+n+'</small><strong>'+fmt(v)+'</strong></div>').join('')+'</div><div class="filters">'+['Posts','Reposts','Liked','Saved'].map((n,i)=>chip(n,'tab:'+i,i===tab)).join('')+'</div>'+cards(items.slice().reverse());}
const dockItems=[
  ['Trading','Trade','M3 17l6-6 4 3 8-10 M15 4h6v6'],
  ['Search','Search','M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M15 15l6 6'],
  ['Clips','Reels','M8 4l12 8-12 8z'],
  ['Leaderboard','Leaderboard','M3 20h18 M5 16v-5h3v5z M11 16V4h3v12z M17 16V8h3v8z'],
  ['Profile','Profile','M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2']
];
function loginScreen(){
  return '<section class="loginCard"><div class="loginArt" aria-hidden="true"></div><div class="loginBody"><h1>Wallet sign-in</h1><p>Use your wallet to trade creator coins on BSC Testnet.</p><div id="walletLogin"></div>'+link('Browse Reels','Clips','guestLink')+'</div></section>';
}
function render(){
  let [p,id]=path();
  if(!pages.includes(p))p='Clips';
  $('.accountLink').textContent=window.pulseWallet.signed()?'Wallet':'Sign in';
  $('nav').innerHTML=dockItems.map(([route,label,icon])=>{
    const active=route===p && (route!=='Profile'||!id||id==='me');
    return '<a href="#'+route+'" class="dockItem '+(route==='Clips'?'center ':'')+(active?'active':'')+'" '+(active?'aria-current="page"':'')+'><span class="dockIcon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+icon+'"/></svg></span>'+label+'</a>';
  }).join('');
  $('main').innerHTML=({Login:loginScreen,Trending:trending,Search:search,Clips:feed,Trading:trade,Leaderboard:ranks,Profile:profile})[p](id);observe();paintWallet();
  if(p==='Login')window.pulseWallet.loginPage($('#walletLogin'),()=>go(id==='portfolio'?'Trading':id&&chan(id)?.coin?'Trading/'+id:'Clips'));
}
function modal(html){$('#form').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
function toast(msg){$('#notice').textContent=msg;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').textContent='',3400);}
function channelForm(next){modal('<h2>Create channel</h2><form id="channel" data-next="'+next+'"><label>Channel name<input name="name" required maxlength="48"></label><button class="primary">Create channel</button></form>');}
function create(){if(!self())return channelForm('create');modal('<h2>Create reel</h2><form id="upload"><label>Reel title<input name="title" required maxlength="90"></label><label>Video file<input type="file" name="video" required accept="video/*"></label><button class="primary">Publish reel</button></form>');}
function action(str,el){let [k,v,id]=str.split(':');if(k==='reelLink'){const url=new URL(location.href);url.hash='Clips/'+encodeURIComponent(v);navigator.clipboard.writeText(url.href).then(()=>toast('Reel link copied')).catch(()=>modal('<label>Reel link<input readonly value="'+esc(url.href)+'"></label>'));return;}if(k==='reelTrade'){const c=clip(id);if(!c)return;modal('<div id="reelTicket" class="chainPanel" data-side="'+v+'" data-owner="'+esc(c.owner)+'"></div>');paintWallet();return;}if(k==='group'){marketGroup=v;return render();}

if(k==='watch'){const list=s.watchlist||[];s.watchlist=list.includes(v)?list.filter(x=>x!==v):[...list,v];save();return render();}
if(k==='create')return create();if(k==='channel')return channelForm('profile');if(k==='launch')return modal('<h2>Launch Channel coin</h2><p>Every reel on your channel will link to this coin.</p><form id="launch"><label>Coin symbol (2–8 letters, A–Z)<input required pattern="[A-Za-z]{2,8}" name="symbol"></label><p>Choose a symbol, then open the market to register your coin with your wallet on BSC Testnet.</p><button class="primary">Confirm launch</button></form>');if(k==='toggle'){s[v]=s[v].includes(id)?s[v].filter(x=>x!==id):[...s[v],id];save();el.classList.toggle('selected',s[v].includes(id));el.setAttribute('aria-pressed',String(s[v].includes(id)));return;}if(k==='category'){category=+v;metric=0;}if(k==='metric')metric=+v;if(k==='range')period=+v;if(k==='tab')tab=+v;if(k==='side')side=v;render();}
document.addEventListener('click',e=>{let el=e.target.closest('[data-go],[data-act]');if(!el)return;if(el.dataset.go)go(el.dataset.go);else action(el.dataset.act,el);});
document.addEventListener('change',e=>{if(e.target.id==='token')go('Trading/'+e.target.value);});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;render();$('#search').focus();$('#search').setSelectionRange(query.length,query.length);}});
const dbReady=new Promise((resolve,reject)=>{let req=indexedDB.open('pulse-clips',1);req.onupgradeneeded=()=>req.result.createObjectStore('videos');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);});
async function hydrate(){let db=await dbReady;let req=db.transaction('videos').objectStore('videos').openCursor();req.onsuccess=()=>{let cur=req.result;if(cur){urls[cur.key]=URL.createObjectURL(cur.value);cur.continue();}else if(path()[0]==='Clips')render();};}
document.addEventListener('submit',async e=>{let f=e.target;if(!f.id)return;e.preventDefault();let d=new FormData(f);if(f.id==='channel'){let name=d.get('name').trim();if(!name)return toast('Enter a channel name.');if(!self())s.channels.push({id:'me',name,followers:[[Date.now(),0]],following:0});save();if(f.dataset.next==='create')return create();go('Profile');}
if(f.id==='launch'){let c=self(),symbol=d.get('symbol').toUpperCase();if(c.coin||s.channels.some(x=>x.coin===symbol))return toast('This symbol is already taken.');Object.assign(c,{coin:symbol,supply:1000000,prices:[[Date.now(),1]]});toast('Coin symbol saved. Open the market to launch.');}
if(f.id==='upload'){let file=d.get('video'),title=d.get('title').trim();if(!title||!file.type.startsWith('video/'))return toast('Enter a title and choose a video.');f.querySelector('button').disabled=true;try{let db=await dbReady,id=crypto.randomUUID();await new Promise((ok,no)=>{let tx=db.transaction('videos','readwrite');tx.objectStore('videos').put(file,id);tx.oncomplete=ok;tx.onabort=no;});urls[id]=URL.createObjectURL(file);s.clips.push({id,owner:'me',title,likes:0,views:[[Date.now(),0]]});tab=0;go('Profile');toast('Reel published.');}catch{f.querySelector('button').disabled=false;return toast('Unable to save this video. Try a smaller file.');}}
save();$('dialog').close();render();});
window.addEventListener('hashchange',()=>{tab=0;render();window.scrollTo(0,0);});render();hydrate().catch(()=>toast('This browser cannot store videos.'));
