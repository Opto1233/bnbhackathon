'use strict';
const $=q=>document.querySelector(q), pages=['Login','Trending','Search','Clips','Trading','Inbox','Profile'], day=86400000, fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2}), esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const epoch=Date.now(), names=['Tokyo Afterhours','Ocean Motion','Stereo Club','Pasta Studio'], titles=['When I text “almost there”','Trying to make it to Friday','When they hand me the aux','My definition of a little cheese'], tags=['NEON','WAVE','BEAT','PASTA'];
function hist(total,i){return [35,30,7,1,.7,.4,.15,0].map((d,j)=>[epoch-day*d,Math.round(total*[.02,.08,.22,.42,.48,.56,.86,1][j])]);}
function seed(){let channels=names.map((name,i)=>({id:String(i+1),name,coin:tags[i],prices:hist([4.8,3.2,2.1,1.6][i]*100,i).map(([t,v])=>[t,v/100]),supply:1000000,followers:hist(38000/(i+1),i),following:16+i}));return {channels,clips:titles.map((title,i)=>({id:String(i+1),owner:String(i+1),title,views:hist([248600,142800,86400,47200][i],i),likes:4200-i*800})),cash:10000,hold:{},closed:channels.map((c,i)=>({owner:c.id,t:epoch-day*.4,pnl:1200-i*310})),likes:[],saves:[],reposts:[]};}
const shared = window.pulseShared;
let sharedProfileStatus=shared?'loading':'ready';
const stateKey = shared ? 'pulse-shared-ui:' + window.PULSE_CONFIG.url : 'pulse-demo-v1';
const myId = () => shared && window.pulseWallet.signed() ? shared.userId : 'me';
let s=JSON.parse(localStorage.getItem(stateKey)||'null')||seed(), period=0, category=2, metric=0, tab=0,side='buy', query='',observer, uploadDB, urls={},noticeTimer;
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
const classicHashtags=[['#StreetLife','#CityNights'],['#Surfing','#Outdoors'],['#DJSet','#Music'],['#Cooking','#Food']];
for(const [index,[id,name,title,...hashtags]] of demoShorts.entries()){
  if(!s.channels.some(channel=>channel.id===id))s.channels.push({id,name,followers:[],following:0});
  if(!s.clips.some(reel=>reel.id===id)){
    const position=s.clips.findIndex(reel=>reel.id===String(index+1));
    s.clips.splice(position+1,0,{id,owner:id,title,hashtags,views:hist(13800-index*1600,index),likes:0});
  }
}
function reelHashtags(reel){
  return reel.hashtags||classicHashtags[Number(reel.id)-1]||reel.title.match(/#[\p{L}\p{N}_]+/gu)||[];
}
function trendingHashtags(){
  const since=Date.now()-day, tags=new Map();
  for(const reel of s.clips){
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
const save=()=>localStorage.setItem(stateKey,JSON.stringify(shared ? {...s, channels:s.channels.filter(c=>!c.shared), clips:s.clips.filter(c=>!c.shared)} : s)),chan=id=>s.channels.find(c=>c.id===id), clip=id=>s.clips.find(c=>c.id===id), self=()=>chan(myId()),last=a=>a.at(-1)?.[1]||0, cut=()=>period===3?-Infinity:Date.now()-[1,7,30][period]*day, pnl=id=>s.closed.filter(x=>x.owner===id&&x.t>=cut()).reduce((a,b)=>a+b.pnl,0);
function stats(a,start=cut()){let base=a.filter(x=>x[0]<=start).at(-1)?.[1]??(start===-Infinity?a[0]?.[1]||0:0),end=last(a);return {delta:end-base,pct:base?(end-base)*100/base:null};}
function growth(n){return n===null?'No baseline yet':(n>=0?'+':'')+fmt(n)+'%';}
function graph(a,mini=false,start=-Infinity){let prev=a.filter(x=>x[0]<=start).at(-1),points=a.filter(x=>x[0]>start);if(Number.isFinite(start))points.unshift([start,prev?.[1]||0]);if(!points.length)points=[[0,0]];let min=Math.min(...points.map(x=>x[1])),max=Math.max(...points.map(x=>x[1])),t=points[0][0],span=points.at(-1)[0]-t||1;let coords=points.map(([x,y])=>[(x-t)/span*200,48-(y-min)/(max-min||1)*43].join(',')).join(' ');return '<svg role="img" aria-label="Trend over time" class="'+(mini?'mini':'chart')+'" viewBox="0 0 200 52" preserveAspectRatio="none"><polygon points="0,52 '+coords+' 200,52" fill="#bfe95013"/><polyline points="'+coords+'" fill="none" stroke="#c9ef61" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';}
const link=(label,path,cl='link')=>'<button class="'+cl+'" data-go="'+esc(path)+'">'+label+'</button>',btn=(label,act,cl='')=>'<button class="'+cl+'" data-act="'+act+'">'+label+'</button>',image=c=>c.shared||c.owner==='me'?'':"background-image:url(media/"+c.id+".jpg)",path=()=>decodeURIComponent(location.hash.slice(1)||'Clips').split('/'),go=p=>{if(path().join('/')===p)render();else location.hash=p;},heading=(name,sub,extra='')=>'<div class="headline"><div><h1>'+name+'</h1><p>'+sub+'</p></div>'+extra+'</div>', chip=(label,act,sel)=>btn(label,act,sel?'selected':'');
function cards(items){return items.length?'<div class="cards">'+items.map(c=>{let ch=chan(c.owner),g=stats(c.views,Date.now()-day);return '<article class="card"><button class="tile" aria-label="Play '+esc(c.title)+'" style="'+image(c)+'" data-go="Clips/'+c.id+'"><b>▷ '+fmt(last(c.views))+'</b></button><div class="details"><h3>'+link(esc(c.title),'Clips/'+c.id)+'</h3><small>'+link(esc(ch.name),'Profile/'+ch.id)+'</small><div class="metrics"><span class="positive">'+growth(g.pct)+'</span>'+graph(c.views,true,Date.now()-day)+'</div><small>+'+fmt(g.delta)+' views · 24h</small></div></article>';}).join('')+'</div>':'<p class="muted">No videos here yet.</p>';}
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
function profileAvatar(channel,className){
  const image=channel?.avatar?'<img class="profileAvatarImage" src="'+esc(channel.avatar)+'" alt="">':'';
  return '<span class="'+className+'" aria-hidden="true">'+esc(channel?.name[0]?.toUpperCase()||'')+image+'</span>';
}
function exploreProfileLink(channel,title,subtitle,route){
  return '<div class="exploreRow">'+link(profileAvatar(channel,'exploreAvatar')+
    '<span class="exploreProfileName"><strong>'+esc(title)+'</strong>'+
    (subtitle?'<small>'+esc(subtitle)+'</small>':'')+'</span>',route,'exploreTitle exploreProfileLink')+'</div>';
}
let exploreTab='all';
function exploreResults(){
  const q=query.trim().toLowerCase(), matches=(...values)=>values.some(value=>String(value||'').toLowerCase().includes(q));
  const reels=s.clips.filter(c=>matches(c.title,chan(c.owner)?.name,chan(c.owner)?.coin? '$'+chan(c.owner).coin : '',...reelHashtags(c)))
    .sort((a,b)=>stats(b.views,Date.now()-day).delta-stats(a.views,Date.now()-day).delta);
  const channels=s.channels.filter(c=>matches(c.name,c.coin&&'$'+c.coin));
  const groups=[
    ['reels', q?'Videos':'Trending videos',reels.map(reel=>{
      const owner=chan(reel.owner);
      return '<article class="exploreRow">'+link('<strong>'+esc(reel.title)+'</strong><small>'+esc(owner?.name||'')+' · '+fmt(last(reel.views))+' views</small>','Clips/'+reel.id,'exploreTitle')+reelThumb(reel)+'</article>';
    })],
    ['channels','Channels',channels.map(c=>exploreProfileLink(c,c.name,fmt(last(c.followers))+' followers','Profile/'+c.id))],
    ['traders','Traders',channels.filter(c=>s.closed.some(trade=>trade.owner===c.id)||c.id===myId()&&Object.keys(s.hold).length).map(c=>exploreProfileLink(c,c.name,'','Profile/'+c.id))],
    ['coins','Creator coins',channels.filter(c=>c.coin).map(c=>exploreProfileLink(c,'$'+c.coin,c.name,'Trading/'+c.id))]
  ];
  const visible=groups.filter(([id,,rows])=>rows.length&&(exploreTab==='all'||exploreTab===id));
  const hashtags=!q&&exploreTab==='all'?'<section class="exploreHashtags"><h2>Trending hashtags</h2><div>'+
    trendingHashtags().map(({name,reels})=>btn(esc(name)+'<small>'+reels+' '+(reels===1?'video':'videos')+'</small>','hashtag:'+esc(name),'hashtag')).join('')+'</div></section>':'';
  const activity=!q&&exploreTab==='all'?'<section class="demoActivity" aria-labelledby="activityHeading"><h2 id="activityHeading">Recent activity <span class="demoLabel">Demo</span></h2><div id="activityRows">'+activityRows()+'</div></section>':'';
  return activity+hashtags+(visible.length ? visible.map(([,title,rows])=>'<section><h2>'+title+'</h2>'+rows.join('')+'</section>').join('')
    : '<p class="emptyView">'+(q?'No results found.':'Nothing to explore here yet.')+'</p>');
}
function search(section){
  const showLeaderboard=section==='Leaderboard';
  const tabs=viewTabs('Explore categories',[
    ['all','For you'],['reels','Videos'],['channels','Channels'],['traders','Traders'],['coins','Coins'],['leaderboard','Leaderboard']
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
  if(Array.isArray(stored))return stored;
  const coin=stored||demoMoments[reelId];
  return coin?[coin]:[];
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
  return (demoShortLikes[reel.id]??reel.likes)+Number(s.likes.includes(reel.id));
}
const shortNumber=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
function recentDemoComments(){
  return demoConversation.filter(row=>row.offset<=demoElapsed);
}
function demoReel(id){return demoConversation.some(row=>row.reel===id);}
function minutesAgo(time){
  const seconds=Math.max(0,Math.floor((Date.now()-time)/1000));
  return seconds<60?'Just now':seconds<3600?Math.floor(seconds/60)+'m ago':Math.floor(seconds/3600)+'h ago';
}
function activityRows(){
  const launches=Object.entries(demoMoments).filter(([reel,moment])=>momentFor(reel)?.offset===moment.offset).map(([reel,moment])=>({
    reel,author:moment.launcher,text:moment.name,time:demoStartedAt+moment.offset*1000,launch:true
  }));
  const events=[...recentDemoComments(),...launches].sort((a,b)=>b.time-a.time).slice(0,3);
  return events.map(({reel,author,text,time,launch})=>{
    const item=clip(reel);
    const action=launch?' created a Moment Coin from ':' commented on ';
    return item?link('<span class="socialAvatar">'+esc(author[0])+'</span><span class="activityCopy"><strong>'+esc(author)+'</strong>'+action+'<b>'+esc(item.title)+'</b><small>'+esc(text)+'</small></span><time datetime="'+new Date(time).toISOString()+'">'+minutesAgo(time)+'</time>','Clips/'+reel,'activityRow'):'';
  }).join('');
}
function tickDemoActivity(){
  if(document.hidden)return;
  demoElapsed++;
  if(!demoConversation.some(row=>row.offset===demoElapsed))return;
  const activity=$('#activityRows');
  if(activity&&!activity.contains(document.activeElement))activity.innerHTML=activityRows();
  for(const {reel} of demoConversation.filter(row=>row.offset===demoElapsed))updateCommentCount(reel);
}
const demoTimer=setInterval(()=>{
  tickDemoActivity();
  if(demoElapsed>=54)clearInterval(demoTimer);
},1000);
function reelComments(id){
  const local=s.comments?.[id]||[];
  const samples=demoConversation.filter(row=>row.reel===id&&(row.offset<=demoElapsed||local.some(reply=>reply.reply===row.id)||s.demoCommentLikes?.includes(row.id)))
    .map(row=>({...row,liked:!!s.demoCommentLikes?.includes(row.id)}));
  return [...samples,...local];
}
function updateCommentCount(id){
  const counter=$('.reel[data-id="'+CSS.escape(id)+'"] [data-act^="comments:"] small');
  if(counter)counter.textContent=fmt(reelComments(id).length);
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
  modal('<h2>Report video</h2><form id="reelReport" data-reel="'+esc(reel.id)+'"><label>Reason<select name="reason" required><option value="">Choose a reason</option><option>Spam</option><option>Harassment</option><option>Other</option></select></label><p class="muted">Demo reports are saved on this device.</p><button class="primary">Save report</button></form>');
}
function inbox(id){
  const contacts=s.channels.filter(c=>c.id!==myId()),person=contacts.find(c=>c.id===id);
  const messages=contact=>{
    const sample=demoInbox[contact.id];
    return [...(sample?[{text:sample.text,time:demoStartedAt+sample.offset*1000,incoming:true}]:[]),...(s.messages?.[contact.id]||[])];
  };
  const people=contacts.slice().sort((a,b)=>(messages(b).at(-1)?.time||0)-(messages(a).at(-1)?.time||0));
  const avatar=c=>'<span class="socialAvatar">'+esc(c.name[0])+'</span>';
  if(!person)return '<section class="inboxPage"><h1>Inbox</h1><p class="muted">Demo chats · saved on this device</p><div class="inboxPeople">'+people.map(c=>
    link(avatar(c)+'<span><strong>'+esc(c.name)+'</strong><small>'+esc(messages(c).at(-1)?.text||'Start a conversation')+'</small></span>','Inbox/'+c.id,'inboxPerson')
  ).join('')+'</div></section>';
  return '<section class="inboxPage"><div class="inboxTop">'+link('‹ Inbox','Inbox','subtle')+avatar(person)+'<h1>'+esc(person.name)+'</h1></div><p class="muted">Demo chat · saved on this device</p>'+
    '<div class="inboxThread" aria-live="polite">'+(messages(person).length?messages(person).map(msg=>'<p class="chatBubble'+(msg.incoming?' incoming':'')+'">'+(msg.incoming?'<small>Demo · '+minutesAgo(msg.time)+'</small>':'')+esc(msg.text)+'</p>').join(''):'<p class="emptyView">Start a demo chat with '+esc(person.name)+'.</p>')+'</div>'+
    '<form id="inboxMessage" class="socialComposer" data-person="'+esc(person.id)+'"><input name="text" aria-label="Message" placeholder="Write a message…" maxlength="500" required><button class="primary">Send</button></form></section>';
}
function submitSocial(form,data){
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
    save();render();$('#inboxMessage input').focus();
    $('.inboxThread').scrollTop=$('.inboxThread').scrollHeight;
  }
}
function reelActions(c){
  function control(label,icon,act,{pressed=null,count=null,showLabel=false,compact=false}={}){
    const state=pressed===null?'':' aria-pressed="'+pressed+'"';
    return '<button type="button" class="railAction '+(showLabel?'reelTrade':'reelIconAction')+'" data-act="'+esc(act)+'" aria-label="'+label+'" title="'+label+'"'+state+'>'+
      reelIcon(icon)+(showLabel?label:'')+(count===null?'':'<small>'+(compact?shortNumber.format(count):fmt(count))+'</small>')+'</button>';
  }
  const actions=[];
  actions.push(control('Trade','trade','reelTrade:'+c.id,{showLabel:true}));
  actions.push(control('Like','like','toggle:likes:'+c.id,{pressed:s.likes.includes(c.id),count:reelLikeCount(c),compact:true}));
  actions.push(control('Comments','comments','comments:'+c.id,{count:reelComments(c.id).length}));
  actions.push(control('Save','save','toggle:saves:'+c.id,{pressed:s.saves.includes(c.id)}));
  actions.push(control('Repost','repost','toggle:reposts:'+c.id,{pressed:s.reposts.includes(c.id)}));
  actions.push(control('Share','share','reelShare:'+c.id));
  actions.push(control('Report','report','reelReport:'+c.id));
  return '<div class="reelRail" role="group" aria-label="Video actions">'+actions.join('')+'</div>';
}
function feed(id){
  const idx=Math.max(0,s.clips.findIndex(c=>c.id===id));
  const items=[...s.clips.slice(idx),...s.clips.slice(0,idx)];
  return '<div class="feed" aria-label="Video feed">'+items.map(c=>{
    const ch=chan(c.owner),seeded=Boolean(punchlines[Number(c.id)-1])&&c.owner===c.id;
    const media=c.media?'crossorigin="anonymous" src="'+esc(c.media)+'"':c.owner==='me'?'src="'+(urls[c.id]||'')+'"':'poster="media/'+c.id+'.jpg" src="media/'+c.id+'.mp4"';
    const backdrop=seeded?' style="--reel-poster:url(media/'+c.id+'.jpg)"':'';
    const caption=seeded?'<div class="memeCaption"><strong>'+esc(c.title)+'</strong><strong>'+esc(punchlines[Number(c.id)-1])+'</strong></div>':'';
    const hashtags=reelHashtags(c).map(tag=>btn(esc(tag),'hashtag:'+esc(tag),'reelHashtag')).join('');
    const coin=ch.coin?link('$'+esc(ch.coin),'Trading/'+ch.id,'coinPill'):'';
    return '<article class="reel" data-id="'+c.id+'"'+backdrop+'><video playsinline muted controls '+media+'></video>'+caption+
      '<button type="button" class="momentGesture" aria-label="Hold to create Moment Coin" title="Hold to create Moment Coin"></button>'+
      '<div class="controls"><div class="byline">'+link(esc(ch.name),'Profile/'+ch.id)+coin+momentBadge(c)+'</div><h3>'+esc(c.title)+'</h3>'+(demoReel(c.id)?'<span class="demoLabel">Demo activity</span>':'')+(hashtags?'<div class="reelHashtags">'+hashtags+'</div>':'')+'</div>'+reelActions(c)+'</article>';
  }).join('')+'</div>';
}
const reelVisibility=.65;
let activeReelWatch, feedRoute;
function applySharedViews(views,count){
  if(count==null)return false;
  const total=Number(count);
  if(!Number.isSafeInteger(total)||total<=last(views))return false;
  views.push([Date.now(),total]);
  return true;
}
function recordReelView(reel){
  if(!reel||reel.owner===myId())return;
  if(reel.shared){
    shared.recordView(reel.id,crypto.randomUUID()).then(count=>{
      const current=clip(reel.id);
      if(current)applySharedViews(current.views,count);
    }).catch(error=>console.warn('Shared view could not be recorded:',error.message));
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
  for(const article of root.querySelectorAll('.reel')){
    const video=article.querySelector('video'), id=article.dataset.id;
    const restored=previous?.id===id?previous:null;
    const watch={id,video,visible:false,counted:restored?.counted||false,position:0};
    watches.set(article,watch);
    if(restored){
      root.scrollTop=article.offsetTop-root.firstElementChild.offsetTop;
      if(restored.position>0)video.addEventListener('loadedmetadata',()=>{
        if(restored.position<video.duration)video.currentTime=restored.position;
      },{once:true});
    }
    function countPlayback(){
      if(!video.isConnected||!watch.visible||document.hidden||video.paused||watch.counted)return;
      watch.counted=true;
      recordReelView(clip(id));
    }
    watch.play=()=>video.play().then(countPlayback).catch(()=>{});
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
  }
  observer=new IntersectionObserver(entries=>{
    if(!root.isConnected)return;
    for(const entry of entries){
      const watch=watches.get(entry.target);
      const visible=entry.intersectionRatio>=reelVisibility;
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
      }
    }
  },{root,threshold:reelVisibility});
  for(const article of watches.keys())observer.observe(article);
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
const marketDemoUsdRate=600;
const marketUsdFormatter=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:6});
function marketUsd(amount){
  const usd=Number(amount)*marketDemoUsdRate;
  return usd>0&&usd<0.000001?'<span title="Less than one millionth of a dollar">&lt;$0.000001</span>':marketUsdFormatter.format(usd);
}
function marketBadge(label,value,explanation){
  return '<span class="marketBadge" title="'+esc(explanation)+'"><span>'+label+'</span> <b>'+value+'</b></span>';
}
function marketAudit(holders,top10){
  const unavailable='Unavailable for this market';
  return '<div class="marketAudit" aria-label="Holder and audit metrics">'+[
    ['Top 10',top10,'Share of circulating coins held by the ten largest wallets'],
    ['Dev holdings',null,unavailable],['Snipers',null,unavailable],
    ['Insiders',null,unavailable],['Bundlers',null,unavailable],
    ['Holders',holders,'Wallets holding circulating coins'],
    ['Blue-chip holders',null,unavailable],['LP burned',null,'No DEX pool'],
    ['DEX paid',null,'DEXScreener payment status unavailable'],['Security',null,'No token safety rating available']
  ].map(([label,value,description])=>marketBadge(label,value??'—',description)).join('')+'</div>';
}
function marketAge(timestamp){
  if(!timestamp)return '—';
  const minutes=Math.floor(Math.max(0,Date.now()-timestamp)/60000);
  if(minutes<1)return '<1m';
  if(minutes<60)return minutes+'m';
  if(minutes<1440)return Math.floor(minutes/60)+'h';
  return Math.floor(minutes/1440)+'d';
}
function marketStats({marketCap,holders,top10,fills,format}){
  const prices=fills.map(fill=>Number(format(BigInt(fill.amount)/BigInt(fill.quantity))));
  const first=prices[0], lastPrice=prices.at(-1);
  const change=prices.length>1&&first>0?(lastPrice-first)/first*100:null;
  const tone=change===null?'':change<0?'negative':'positive';
  let chart='<small>'+(prices.length?'1 recent fill':'No recent fills')+'</small>';
  if(change!==null){
    const low=Math.min(...prices), span=Math.max(...prices)-low;
    const points=prices.map((value,i)=>[2+96*i/(prices.length-1),span?30-28*(value-low)/span:16]);
    chart='<svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="Recent fill prices"><polyline points="'+points.join(' ')+'"/></svg>';
  }
  const stat=(label,value)=>'<span class="marketStat"><small>'+label+'</small><b>'+value+'</b></span>';
  const volume=fills.reduce((sum,fill)=>sum+BigInt(fill.amount),0n);
  const buys=fills.filter(fill=>fill.side==='buy').length;
  const changeLabel=change===null?'':'<small class="'+tone+'" title="Fill price change from first to latest trade">'+
    (change>0?'+':'')+change.toFixed(2)+'%</small>';
  return '<div class="marketNumbers"><span class="marketSpark '+tone+'">'+chart+'</span>'+
    '<div class="marketCap">'+stat('Market cap',marketUsd(marketCap))+changeLabel+'</div>'+
    stat('Liquidity','<span title="No DEX pool">—</span>')+stat('Volume',marketUsd(format(volume)))+
    stat('TXNs',fmt(fills.length)+' <small><span class="positive" title="Buys">'+fmt(buys)+' B</span> / <span class="negative" title="Sells">'+fmt(fills.length-buys)+' S</span></small>')+
    '</div>'+marketAudit(holders,top10);
}
function marketRow({name,detail,art,key,action,stats,creatorId,age,views}){
  const saved=s.watchlist?.includes(key);
  return '<article class="marketRow"><div class="marketIdentity"><span class="assetArt" aria-hidden="true" style="'+art+'">'+(art?'':esc(name[0]))+'</span>'+
    '<div class="assetName"><strong>'+esc(name)+'</strong><small>'+detail+'</small><small class="marketIdentityStats">'+
    marketBadge('Age',esc(marketAge(age)),'Time since launch')+marketBadge('Views',fmt(views),'Source video views')+
    marketBadge('Fee','0%','Pulse protocol fee')+'</small></div></div>'+
    '<div class="marketStats"'+(creatorId?' data-creator-stats="'+esc(creatorId)+'"':'')+'>'+stats+'</div>'+
    '<div class="marketActions">'+action+'<button class="star" data-act="watch:'+esc(key)+'" aria-pressed="'+!!saved+
    '" aria-label="Watchlist: '+esc(name)+'">'+(saved?'★':'☆')+'</button></div></article>';
}
function momentCreatedAt(coin){
  return coin.createdAt??(coin.offset==null?null:demoStartedAt+coin.offset*1000);
}
function momentMarketCap(position){
  return momentBNB(momentPrice(position.sold)*BigInt(position.sold));
}
function momentMarket(){
  const moments=s.clips.flatMap(reel=>momentsFor(reel.id).map(coin=>({reel,coin,id:coin.id||reel.id})))
    .filter(({id})=>marketGroup!=='saved'||s.watchlist?.includes('moment-'+id));
  if(!moments.length)return '';
  const ledger=momentLedger();
  return '<section class="momentMarket"><h2>Moment Coins <span class="demoLabel">Demo</span></h2><p class="marketScope">Activity uses the last 20 demo fills on this device. Market cap uses circulating coins. — means unavailable.</p>'+
    moments.map(({reel,coin,id})=>{
      const position=momentPosition(ledger,id);
      return marketRow({
        name:coin.name,detail:esc(reel.title)+' · '+momentTime(coin.time)+' · '+esc(coin.launcher||'You'),
        art:image(reel),key:'moment-'+id,views:last(reel.views),
        age:momentCreatedAt(coin),action:btn('Trade',momentAction('tradeMoment',reel,coin),'marketTrade'),
        stats:marketStats({marketCap:momentMarketCap(position),
          holders:position.owned>0?1:0,top10:position.owned>0?'100%':null,
          fills:position.fills||[],format:momentBNB})
      });
    }).join('')+'</section>';
}
function marketHome(){
  const visible=marketGroup==='moments'?[]:s.channels.filter(c=>c.coin&&(marketGroup!=='saved'||s.watchlist?.includes(c.id)));
  const moments=marketGroup==='creators'?'':momentMarket();
  return '<div class="marketHome"><div class="balanceBlock"><div><small>BSC TESTNET · CHAIN 97</small><h1>Coin markets</h1><p>Market values use a demo rate of '+marketUsd(1)+' per tBNB.</p></div></div>'+
    '<div class="marketTabs" role="group" aria-label="Coin markets">'+
    [['creators','Creator Coins'],['moments','Moment Coins'],['saved','Watchlist']].map(([key,label])=>
      '<button type="button" class="'+(key===marketGroup?'selected':'')+'" data-act="group:'+key+
      '" aria-pressed="'+(key===marketGroup)+'">'+label+'</button>').join('')+'</div>'+
    (visible.length?'<h2>Creator Coins</h2><p class="marketScope">Activity uses the last 1,000 BSC Testnet blocks. Market cap uses circulating coins. — means unavailable.</p>'+
      visible.map(c=>marketRow({
        name:'$'+c.coin,detail:esc(c.name),art:c.shared||c.id==='me'?'':'background-image:url(media/'+encodeURIComponent(c.id)+'.jpg)',
        key:c.id,views:s.clips.filter(reel=>reel.owner===c.id).reduce((total,reel)=>total+last(reel.views),0),
        action:link('Trade','Trading/'+c.id,'marketTrade'),creatorId:c.id,
        stats:'<small class="marketDataStatus">Loading market data…</small>'
      })).join(''):'')+
    (!visible.length&&!moments?'<p class="emptyMarket">'+(marketGroup==='saved'?'Star a coin to add it to your watchlist.':'No coins available.')+'</p>':'')+moments+'</div>';
}
async function paintMarketRows(){
  const rows=[...document.querySelectorAll('[data-creator-stats]')];
  if(!rows.length)return;
  let snapshot;
  try{snapshot=await window.pulseWallet.marketSnapshot(rows.map(row=>chan(row.dataset.creatorStats)));}
  catch{snapshot=new Map();}
  for(const row of rows){
    if(!row.isConnected)continue;
    const data=snapshot.get(row.dataset.creatorStats);
    if(data&&!data.status)row.innerHTML=marketStats(data);
    else{
      const message=document.createElement('small');
      message.className='marketDataStatus';
      message.textContent=data?.status||'Market data unavailable';
      row.replaceChildren(message);
    }
  }
}
function trade(id){
  if(!id)return marketHome();
  const c=s.channels.find(x=>x.coin&&x.id===id);
  if(!c)return marketHome();
  return heading('Trading','BSC Testnet · tBNB',link('All markets','Trading',''))+
    '<div class="layout"><section class="panel"><h2>'+esc(c.name)+'</h2>'+link('View profile','Profile/'+c.id)+'<p>Channel coin $'+esc(c.coin)+'</p></section><section class="panel chainPanel" id="chainPanel"></section></div>'+
    '<h2 class="sectionhead">Latest videos</h2>'+cards(s.clips.filter(x=>x.owner===c.id).slice().reverse());
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
    const channelViews=mode==='views'?s.clips.filter(c=>c.owner===channel.id).reduce((sum,clip)=>sum+stats(clip.views,since).delta,0):null;
    const value=mode==='views'?channelViews:profitability?(positionRanks?item.pnl:pnl(channel.id)):mode==='growth'?pct:mode==='followers'?last(history):delta;
    const score=value===null?'No baseline':profitability?(value>0?'+':'')+fmt(value)+' THB':mode==='growth'?growth(value):fmt(value)+(clipRanks||mode==='views'?' views':' followers');
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
function followedProfiles(){return s.profileFollows?.[myId()]||[];}
function profile(id=myId()){
  if(id==='me')id=myId();
  const channel=chan(id), mine=id===myId();
  if(!channel&&!mine){
    const heading='<h1>Profile</h1>';
    if(sharedProfileStatus==='loading')return heading+'<p class="emptyView" role="status">Loading channel…</p>';
    if(sharedProfileStatus==='failed')return heading+'<p class="emptyView" role="status">Could not load this channel.</p>'+
      btn('Retry','retrySharedProfile','primary');
    return heading+'<p class="emptyView">Channel not found.</p>';
  }
  const owned=s.clips.filter(reel=>reel.owner===id);
  const items=mine&&tab?s.clips.filter(reel=>s[['','reposts','likes','saves'][tab]].includes(reel.id)):owned;
  const name=channel?.name||'My profile', handle=channel?.name.toLowerCase().replaceAll(/[^\p{L}\p{N}]+/gu,'_').replace(/^_|_$/g,'');
  const likes=owned.reduce((total,reel)=>total+reelLikeCount(reel),0);
  const action=!channel?btn('Create channel','channel','primary'):channel.coin?link('Trade $'+esc(channel.coin),'Trading/'+channel.id,'primary'):mine?btn('Launch channel coin','launch','primary'):'';
  const following=followedProfiles();
  const isFollowing=following.includes(id);
  const localFollowers=Object.values(s.profileFollows||{}).filter(ids=>ids.includes(id)).length;
  const stats=[['Following',(channel?.following||0)+(mine?following.length:0)],
    ['Followers',last(channel?.followers||[])+localFollowers],['Likes',likes]];
  const social=mine?'':'<div class="profileSocialActions">'+
    '<button type="button" class="profileFollow'+(isFollowing?'':' primary')+'" data-act="followProfile:'+esc(id)+
    '" aria-label="Follow '+esc(name)+'" aria-pressed="'+isFollowing+'">'+(isFollowing?'Following':'Follow')+'</button>'+
    link('Message','Inbox/'+id,'profileMessage')+'</div>';
  return '<section class="creatorProfile"><div class="creatorIntro"><div class="creatorDetails"><h1>'+esc(name)+'</h1>'+
    (handle?'<p>@'+esc(handle)+'</p>':'')+'<dl class="creatorStats">'+stats.map(([label,count])=>'<div><dt>'+label+'</dt><dd>'+fmt(count)+'</dd></div>').join('')+'</dl></div>'+profileAvatar(channel||{name},'creatorAvatar')+'</div>'+
    social+(action||mine&&channel?'<div class="creatorActions">'+action+(mine&&channel?btn('Create video','create','')+btn('Edit profile photo','editPhoto',''):'')+'</div>':'')+
    (mine?'<section class="panel portfolio" id="holdings"></section>':'')+
    (mine?viewTabs('Profile videos',[[0,'Posts'],[1,'Reposts'],[2,'Liked'],[3,'Saved']],tab,'tab'):'<h2 class="profilePosts">Posts</h2>')+
    (items.length?'<div class="creatorGrid">'+items.slice().reverse().map(reel=>reelThumb(reel)).join('')+'</div>':'<p class="emptyView">No videos here yet.</p>')+'</section>';
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
function render(){
  let [p,id]=path();
  if(p==='Leaderboard'){
    p='Search';id='Leaderboard';
    history.replaceState(null,'','#Search/Leaderboard');
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
  const previous=p==='Clips'&&feedRoute===location.hash?activeReelWatch:null;
  activeReelWatch?.video.pause();
  feedRoute=p==='Clips'?location.hash:null;
  $('main').innerHTML=({Login:loginScreen,Trending:trending,Search:search,Clips:feed,Trading:trade,Inbox:inbox,Profile:profile})[p](id);observe(previous);paintWallet();paintMarketRows();
  if(p==='Login')window.pulseWallet.loginPage($('#walletLogin'),()=>go(['portfolio','profile'].includes(id)?'Profile':id&&chan(id)?.coin?'Trading/'+id:'Clips'));
}
function modal(html){$('#form').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
const momentTradeStorage='pulse-moment-trading-v1';
const momentUnit=10n**16n, momentCurveCap=500000, momentTarget=momentUnit*3n/10n;
function momentLedger(){
  return JSON.parse(localStorage.getItem(momentTradeStorage)||'null')||{cash:String(10n*momentUnit),markets:{}};
}
function momentPosition(ledger,id){return ledger.markets[id]||{sold:0,owned:0};}
function momentPrice(sold){return 4000000000n+8000n*BigInt(sold);}
function momentReserve(sold){return BigInt(sold)*(momentPrice(0)+momentPrice(sold))/2n;}
function momentBNB(amount){
  const decimals=(amount%momentUnit).toString().padStart(16,'0').replace(/0+$/,'');
  return (amount/momentUnit).toString()+(decimals?'.'+decimals:'');
}
function quoteMoment(position,side,requested){
  if(position.sold===momentCurveCap)throw Error('This coin has reached the end of its demo curve.');
  if(!Number.isSafeInteger(requested)||requested<=0)throw Error('Enter a whole number of coins.');
  const buy=side==='buy';
  if(!buy&&requested>position.owned)throw Error('You do not have enough Moment Coins.');
  const quantity=buy?Math.min(requested,momentCurveCap-position.sold):requested;
  const sold=position.sold+(buy?quantity:-quantity);
  const amount=buy?momentReserve(sold)-momentReserve(position.sold):momentReserve(position.sold)-momentReserve(sold);
  return {side,requested,quantity,sold,amount,before:position.sold};
}
function settleMoment(reelId,preview){
  const ledger=momentLedger(), position=momentPosition(ledger,reelId), buying=preview.side==='buy';
  if(position.sold!==preview.before)throw Error('The price changed. Preview the trade again.');
  const quote=quoteMoment(position,preview.side,preview.requested);
  const cash=BigInt(ledger.cash);
  if(buying&&cash<quote.amount)throw Error('Your demo tBNB balance is too low.');
  ledger.cash=String(cash+(buying?-quote.amount:quote.amount));
  const fill={side:quote.side,quantity:quote.quantity,amount:String(quote.amount)};
  ledger.markets[reelId]={sold:quote.sold,owned:position.owned+(buying?quote.quantity:-quote.quantity),
    fills:[...(position.fills||[]),fill].slice(-20)};
  localStorage.setItem(momentTradeStorage,JSON.stringify(ledger));
  return quote;
}
function momentMarketChart(position,view){
  const history=view==='fills';
  const values=history?(position.fills||[]).map(fill=>BigInt(fill.amount)/BigInt(fill.quantity)):[momentPrice(0),momentPrice(momentCurveCap)];
  if(!values.length)return '<p class="momentChartEmpty">Confirmed trades will appear here.</p>';
  const min=values.reduce((a,b)=>a<b?a:b), max=values.reduce((a,b)=>a>b?a:b);
  const y=value=>15+90*(1-Number(value-min)/Number(max-min||1n));
  const points=values.map((value,i)=>[values.length===1?160:8+i*304/(values.length-1),max===min?60:y(value)]);
  const mark=history?points.at(-1):[8+304*position.sold/momentCurveCap,y(momentPrice(position.sold))];
  const dots=points.map(([x,y],index)=>history?'<circle cx="'+x+'" cy="'+y+'" r="3" class="'+((position.fills[index].side==='sell')?'sold':'bought')+'"/>':'').join('');
  return '<div class="momentPlot"><svg viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="'+(history?'Confirmed demo fill prices':'Bonding curve with current price marked')+'">'+
    '<path class="plotGrid" d="M8 15H312 M8 60H312 M8 105H312"/>'+
    '<path class="plotGuide" d="M8 '+mark[1]+'H312"/>'+
    '<polyline class="plotLine" points="'+points.map(point=>point.join(',')).join(' ')+'"/>'+dots+
    (history?'':'<circle class="plotMarker" cx="'+mark[0]+'" cy="'+mark[1]+'" r="5"/>')+'</svg>'+
    '<div class="momentPlotScale'+(max===min?' flat':'')+'"><span>'+momentBNB(max)+'</span>'+(max===min?'':'<span>'+momentBNB(min)+'</span>')+'</div></div>'+
    '<div class="momentPlotAxis"><span>'+(history?'First shown fill':'0 sold')+'</span><span>'+(history?'Latest fill':'500,000 sold')+'</span></div>';
}
function momentFillList(fills){
  const rows=fills.slice().reverse().map(fill=>{
    const buying=fill.side==='buy';
    return '<li><strong class="'+(buying?'bought':'sold')+'">'+(buying?'Buy':'Sell')+'</strong><span>'+fmt(fill.quantity)+' coins</span><span>'+momentBNB(BigInt(fill.amount))+' tBNB</span></li>';
  }).join('');
  return '<details class="momentFillList"><summary>Recent trades <span>'+fills.length+'</span></summary>'+
    (rows?'<ol>'+rows+'</ol>':'<p>No trades recorded yet.</p>')+'</details>';
}
function openMomentTrade(reel,coin,{view='curve',back=()=>$('dialog').close()}={}){
  if(!coin)return;
  const coinId=coin.id||reel.id;
  const coins=momentsFor(reel.id);
  const switcher=coins.length>1?'<label class="momentCoinSwitcher">Switch coin <select id="momentCoinSelect">'+
    coins.map(option=>{
      const id=option.id||reel.id;
      return '<option value="'+esc(id)+'"'+(id===coinId?' selected':'')+'>'+
        esc(option.name)+' · '+momentTime(option.time)+'</option>';
    }).join('')+'</select></label>':'';
  const ledger=momentLedger(), position=momentPosition(ledger,coinId);
  const reserve=momentReserve(position.sold);
  const complete=position.sold===momentCurveCap;
  const label=esc(coin.name), fills=position.fills||[];
  const imageStyle=image(reel), price=momentBNB(momentPrice(position.sold)), balance=momentBNB(BigInt(ledger.cash));
  modal('<section id="momentTicket" aria-label="Moment Coin trading">'+
    '<div class="momentMarketHeader"><button type="button" class="momentBack" aria-label="Back" title="Back">'+
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg></button></div>'+
    '<div class="momentAsset"><span class="momentAssetArt" aria-hidden="true" style="'+imageStyle+'">'+(imageStyle?'':esc(coin.name[0]))+'</span>'+
    '<div class="momentAssetMeta"><h2>'+label+'</h2>'+btn(esc(reel.title)+' ↗',momentAction('momentDetail',reel,coin),'subtle')+switcher+'</div>'+
    '<div class="momentAssetPrice"><strong>'+price+'</strong><small>tBNB per coin</small></div></div>'+
    '<div class="momentChart"><div class="momentChartHeading"><div class="momentChartOptions" role="group" aria-label="Price chart">'+
    '<button type="button" data-chart="curve" aria-pressed="'+(view==='curve')+'">Curve</button><button type="button" data-chart="fills" aria-pressed="'+(view==='fills')+'">Trade prices</button></div><small>tBNB</small></div>'+
    '<div class="momentChartBody">'+momentMarketChart(position,view)+'</div></div>'+
    '<div class="momentPosition"><div class="momentTradeStats"><div><small>Your coins</small><strong>'+fmt(position.owned)+'</strong></div>'+
    '<div><small>Demo balance</small><strong>'+balance+' tBNB</strong></div></div>'+
    '<label class="momentTradeProgress">Curve reserve <strong>'+momentBNB(reserve)+' / 0.30 tBNB</strong><progress max="'+momentTarget+'" value="'+reserve+'"></progress></label></div>'+
    momentFillList(fills)+
    '<div class="momentTradeFooter">'+(complete?'<p>This coin has completed its demo curve.</p>':
      '<form id="momentOrder"><label>Quantity <input name="quantity" type="number" min="1" max="1000000" step="1" value="100000" required></label>'+
      '<div class="momentOrderActions"><button class="tradeBuy" type="submit" value="buy">Buy</button><button class="tradeSell" type="submit" value="sell">Sell</button></div></form>'+
      '<div class="momentOrderPreview" hidden></div>')+'<p class="momentTradeStatus" role="status"></p></div></section>');
  $('.momentBack').onclick=back;
  const select=$('#momentCoinSelect');
  select?.addEventListener('change',()=>{
    const next=momentFor(reel.id,select.value);
    if(!next||next===coin)return;
    openMomentTrade(reel,next,{view,back});
    $('#momentCoinSelect')?.focus({preventScroll:true});
  });
  const chartButtons=$('#momentTicket').querySelectorAll('[data-chart]');
  for(const button of chartButtons)button.onclick=()=>{
    view=button.dataset.chart;
    for(const item of chartButtons)item.setAttribute('aria-pressed',String(item===button));
    $('.momentChartBody').innerHTML=momentMarketChart(position,view);
  };
  const form=$('#momentOrder');
  if(!form)return;
  const panel=$('.momentOrderPreview'), status=$('.momentTradeStatus');
  form.addEventListener('input',()=>{panel.hidden=true;status.textContent='';});
  form.addEventListener('submit',event=>{
    event.preventDefault();event.stopPropagation();
    if(!form.reportValidity())return;
    status.textContent='';panel.hidden=true;
    let quote;
    try{quote=quoteMoment(momentPosition(momentLedger(),coinId),event.submitter?.value==='sell'?'sell':'buy',form.elements.quantity.valueAsNumber);}
    catch(error){status.textContent=error.message;return;}
    const buy=quote.side==='buy', verb=buy?'Buy':'Sell';
    panel.hidden=false;
    panel.innerHTML='<p>'+verb+' '+fmt(quote.quantity)+' coins · '+(buy?'Pay ':'Receive ')+momentBNB(quote.amount)+' tBNB</p>'+
      (quote.quantity<quote.requested?'<p>Only '+fmt(quote.quantity)+' coins remain. You pay for the filled amount.</p>':'')+
      (quote.sold===momentCurveCap?'<p>This purchase completes the demo curve and closes trading.</p>':'')+
      '<small>Platform fee: 0 tBNB</small><button type="button" class="primary">Confirm '+verb+'</button>';
    const confirm=panel.querySelector('button');
    confirm.onclick=async()=>{
      confirm.disabled=true;
      try{
        const execute=()=>settleMoment(coinId,quote);
        const fill=navigator.locks?await navigator.locks.request(momentTradeStorage,execute):execute();
        if(!status.isConnected||!$('dialog').open)return;
        if($('.marketHome'))render();
        openMomentTrade(reel,coin,{view,back});
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
  return Math.floor(seconds/60)+':'+(seconds%60).toFixed(2).padStart(5,'0');
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
  if(!media)return;
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
  const art=image(reel);
  modal('<section class="momentSheet"><h2>Moment Coins</h2><p class="momentSource">'+esc(reel.title)+'</p>'+
    '<ul class="momentPicker">'+coins.map(coin=>{
      const position=momentPosition(ledger,coin.id||reel.id);
      return '<li><button type="button" class="momentPickerCoin" data-act="'+momentAction('momentDetail',reel,coin)+'">'+
        '<span class="assetArt" style="'+art+'" aria-hidden="true">'+(art?'':esc(coin.name[0]))+
        '<canvas class="momentPickerFrame" width="112" height="112"></canvas></span>'+
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
  if(!media)return toast('This clip is unavailable.');
  const hasCrop=!existing||Boolean(existing.crop);
  const resume=source&&!source.paused;
  source?.pause();
  const start=existing?.time??source?.currentTime??0;
  modal('<section class="momentSheet"><h2>'+(existing?'Moment Coin':'Create Moment Coin')+'</h2>'+
    '<p class="momentSource">'+esc(reel.title)+' · '+esc(chan(reel.owner).name)+'</p>'+
    '<video crossorigin="anonymous" class="momentPreview" muted playsinline preload="auto" src="'+esc(media)+'"'+(hasCrop?' hidden':' aria-label="Selected frame"')+'></video>'+
    (hasCrop?'<canvas class="momentCrop" width="512" height="512" '+(existing?'role="img" aria-label="Cropped Moment Coin frame"':'tabindex="0" aria-label="Crop preview" aria-describedby="momentCropHelp"')+'></canvas>':'')+
    (existing?'<h3>'+esc(existing.name)+'</h3><p>'+esc(existing.description)+'</p><p>Frame '+momentTime(existing.time)+' · Created by '+esc(existing.launcher||'You')+'</p><small>Demo Moment Coin</small><div class="momentDetailActions">'+btn('Trade',momentAction('tradeMoment',reel,existing),'primary')+
      btn('Create another Moment Coin','newMoment:'+esc(reel.id),'subtle')+
      (momentsFor(reel.id).length>1?btn('All moments','reelMoment:'+esc(reel.id),'subtle'):'')+'</div>':
      '<form id="momentLaunch"><label class="momentTimeline">Choose a frame <output></output><input name="frame" type="range" min="0" step=".01" value="0" disabled></label>'+
      '<div class="momentCropControls"><label class="momentZoom">Zoom <output>1.00×</output><input name="zoom" type="range" min="1" max="4" step=".05" value="1"></label><button type="button" class="subtle momentCropReset">Reset crop</button></div>'+
      '<p id="momentCropHelp">Drag the frame or use arrow keys to position it.</p>'+
      '<label>Coin name<input name="name" maxlength="60" required></label>'+
      '<label>Description<textarea name="description" maxlength="220" rows="2" required></textarea></label>'+
      '<button type="submit" class="primary" disabled>Create demo coin</button><small>Saved on this device</small></form>')+
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
  if(form)form.addEventListener('submit',event=>{
    event.preventDefault();
    event.stopPropagation();
    if(submit.disabled)return;
    const name=form.elements.name.value.trim(), description=form.elements.description.value.trim();
    if(!name||!description){status.textContent='Enter a coin name and description.';return;}
    const latest=JSON.parse(localStorage.getItem(stateKey)||'null');
    s.moments={...s.moments,...latest?.moments};
    const previous=s.moments[reel.id], coins=momentsFor(reel.id);
    const coin={name,description,time:Number(track.value),crop:editor.crop,ownerId:reel.owner,clipId:reel.id,
      createdAt:Date.now(),launcher:self()?.name||'You'};
    // Keep the first coin on the original reel key so existing holdings stay attached.
    if(coins.length)coin.id=crypto.randomUUID();
    s.moments[reel.id]=[...coins,coin];
    try{save();}catch{
      if(previous===undefined)delete s.moments[reel.id];
      else s.moments[reel.id]=previous;
      status.textContent='Could not save this Moment Coin.';return;
    }
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
function create(){if(!self())return channelForm('create');modal('<h2>Create video</h2><form id="upload"><label>Video title<input name="title" required maxlength="90"></label><label>Video file<input type="file" name="video" required accept="video/*"></label><button class="primary">Publish video</button></form>');}
function action(str,el){let [k,v,id]=str.split(':');
if(k==='about')return modal('<section class="aboutPulse" aria-labelledby="aboutPulseTitle">'+
  '<h2 id="aboutPulseTitle">About us</h2>'+
  '<p>Pulse is a short-video platform for discovering creators and trading coins tied to channels and memorable clips.</p>'+
  '<dl><dt>Creator Coins</dt><dd>Trade coins tied to creator channels on BSC Testnet.</dd>'+
  '<dt>Moment Coins</dt><dd>Pick and crop a frame from a video, then create a coin and try trading it with a demo balance.</dd></dl></section>');
if(k==='retrySharedProfile'&&shared)return loadShared();
if(shared && ['channel','create','launch'].includes(k) && !window.pulseWallet.signed()){
  toast('Sign in with your wallet to publish.');return go('Login/profile');
}
if(k==='editPhoto'){
  if(!self())return;
  return modal('<h2>Edit profile photo</h2><form id="profilePhoto">'+
    '<label>Choose a photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label>'+
    '<button class="primary">Save photo</button></form>');
}
if(k==='followProfile'){
  if(v===myId()||!chan(v))return;
  const following=followedProfiles();
  (s.profileFollows??={})[myId()]=following.includes(v)?following.filter(id=>id!==v):[...following,v];
  save();render();$('.profileFollow')?.focus();
  return;
}
if(k==='hashtag'){query=v;exploreTab='reels';return go('Search');}
if(k==='comments'||k==='reply')return showComments(clip(v),id);
if(k==='commentLike'){
  const comment=reelComments(v).find(item=>item.id===id);
  if(!comment)return;
  const liked=!comment.liked;
  if(comment.demo){
    const likes=s.demoCommentLikes||[];
    s.demoCommentLikes=liked?[...likes,id]:likes.filter(key=>key!==id);
  }else comment.liked=liked;
  save();el.setAttribute('aria-pressed',String(liked));return;
}
if(k==='reelReport')return reportReel(clip(v));
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
    return openMomentTrade(reel,coin,{back});
  }
  if(k==='reelMoment'&&momentsFor(v).length>1)return openMomentPicker(reel);
  if(id&&!coin)return;
  return openMoment(reel,source,coin);
}
if(k==='reelShare')return shareReel(clip(v));if(k==='reelTrade')return openReelTrade(clip(v),el.closest('.reel')?.querySelector('video'));if(k==='explore'){
  if(v==='leaderboard')return go('Search/Leaderboard');
  exploreTab=v;return go('Search');
}if(k==='group'){marketGroup=v;return render();}

if(k==='watch'){const list=s.watchlist||[];s.watchlist=list.includes(v)?list.filter(x=>x!==v):[...list,v];save();return render();}
if(k==='create')return create();if(k==='channel')return channelForm('profile');if(k==='launch')return modal('<h2>Launch Channel coin</h2><p>Every video on your channel will link to this coin.</p><form id="launch"><label>Coin symbol (2–8 letters, A–Z)<input required pattern="[A-Za-z]{2,8}" name="symbol"></label><p>Choose a symbol, then open the market to register your coin with your wallet on BSC Testnet.</p><button class="primary">Confirm launch</button></form>');if(k==='toggle'){s[v]=s[v].includes(id)?s[v].filter(x=>x!==id):[...s[v],id];save();el.classList.toggle('selected',s[v].includes(id));el.setAttribute('aria-pressed',String(s[v].includes(id)));
if(v==='likes')el.querySelector('small').textContent=shortNumber.format(reelLikeCount(clip(id)));
return;}if(k==='category'){category=+v;metric=0;}if(k==='metric')metric=+v;if(k==='range')period=+v;if(k==='tab')tab=+v;if(k==='side')side=v;render();}
document.addEventListener('click',e=>{
  const center=e.target.closest('.momentGesture');
  if(center){
    const reel=center.closest('.reel'), video=reel.querySelector('video');
    if(e.detail===0)openMoment(clip(reel.dataset.id),video);
    else if(!$('dialog').open){if(video.paused)video.play().catch(()=>{});else video.pause();}
    return;
  }
  let el=e.target.closest('[data-go],[data-act]');if(!el)return;if(el.dataset.go)go(el.dataset.go);else action(el.dataset.act,el);});
document.addEventListener('load',event=>{
  if(event.target instanceof HTMLImageElement&&event.target.matches('.profileAvatarImage'))event.target.classList.add('avatarReady');
},true);
document.addEventListener('change',e=>{if(e.target.id==='token')go('Trading/'+e.target.value);});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;$('#exploreResults').innerHTML=exploreResults();}});
const dbReady=!shared && new Promise((resolve,reject)=>{let req=indexedDB.open('pulse-clips',1);req.onupgradeneeded=()=>req.result.createObjectStore('videos');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);});
async function hydrate(){let db=await dbReady;let req=db.transaction('videos').objectStore('videos').openCursor();req.onsuccess=()=>{let cur=req.result;if(cur){urls[cur.key]=URL.createObjectURL(cur.value);cur.continue();}else if(['Clips','Profile','Search'].includes(path()[0]))render();};}
let sharedRead = 0;
let sharedSignature = null;
async function refreshShared() {
  const request = ++sharedRead;
  if(sharedProfileStatus==='failed'){
    sharedProfileStatus='loading';
    if(path()[0]==='Profile')render();
  }
  let feed;
  try{feed=await shared.feed();}
  catch(error){
    if(request!==sharedRead)return;
    if(sharedProfileStatus!=='ready'){
      sharedProfileStatus='failed';
      if(path()[0]==='Profile')render();
    }
    throw error;
  }
  if(request !== sharedRead)return;
  const {creators,videos}=feed;
  sharedProfileStatus='ready';
  const signature = JSON.stringify({
    creators: creators.map(c=>[c.id,c.name,c.ticker,c.avatar_updated_at]),
    videos: videos.map(v=>[v.id,v.creator_id,v.title,v.created_at])
  });
  const known = new Map(s.clips.filter(c=>c.shared).map(c=>[c.id,c]));
  if(signature===sharedSignature){
    let viewsChanged=false;
    for(const video of videos){
      const current=known.get(video.id);
      if(current&&applySharedViews(current.views,video.view_count))viewsChanged=true;
    }
    if(viewsChanged&&path()[0]!=='Clips'&&!$('dialog').open&&document.activeElement?.id!=='search')render();
    return;
  }
  sharedSignature=signature;
  s.channels = [...s.channels.filter(c=>!c.shared), ...creators.map(c=>({
    id:c.id, name:c.name, coin:c.ticker, walletId:c.wallet, shared:true, avatar:shared.avatar(c), followers:[], following:0
  }))];
  s.clips = [...videos.map(v=>{
    const views=known.get(v.id)?.views||[[Date.now(),0]];
    applySharedViews(views,v.view_count);
    return {id:v.id, owner:v.creator_id, title:v.title, shared:true, media:shared.media(v), likes:0, views};
  }), ...s.clips.filter(c=>!c.shared)];
  render();
}

async function prepareProfilePhoto(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)
    throw Error('Choose a JPG, PNG, or WebP photo up to 10 MB.');
  const url=URL.createObjectURL(file);
  try{
    const photo=new Image();
    photo.src=url;
    await photo.decode();
    const side=Math.min(photo.naturalWidth,photo.naturalHeight);
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=256;
    const context=canvas.getContext('2d');
    context.fillStyle='#2a3022';
    context.fillRect(0,0,256,256);
    context.drawImage(photo,(photo.naturalWidth-side)/2,(photo.naturalHeight-side)/2,side,side,0,0,256,256);
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
    const canvas=await prepareProfilePhoto(form.elements.photo.files[0]);
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
  }catch(error){toast(error.message||'Could not save your photo. Please retry.');}
  finally{button.disabled=false;}
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
      await shared.publish(file,data.get('title').trim(),form.dataset.videoId);
    }
    await refreshShared();
    $('dialog').close();
    if(form.id==='channel' && form.dataset.next==='create')return create();
    tab=0;go('Profile');
    if(form.id==='upload')toast('Video published.');
  }catch(error){
    const tickerTaken = form.id==='launch' && ['23505','23514'].includes(error.code);
    toast(tickerTaken?'That ticker is taken or reserved. Try another.':error.message || 'Could not save. Please retry.');
  }finally{button.disabled=false;}
}

document.addEventListener('submit',async e=>{let f=e.target;if(!f.id)return;e.preventDefault();let d=new FormData(f);if(f.id==='profilePhoto')return saveProfilePhoto(f);if(shared && ['channel','launch','upload'].includes(f.id))return submitShared(f,d);if(['reelComment','reelReport','inboxMessage'].includes(f.id))return submitSocial(f,d);if(f.id==='channel'){let name=d.get('name').trim();if(!name)return toast('Enter a channel name.');if(!self())s.channels.push({id:'me',name,followers:[[Date.now(),0]],following:0});save();if(f.dataset.next==='create')return create();go('Profile');}
if(f.id==='launch'){let c=self(),symbol=d.get('symbol').toUpperCase();if(c.coin||s.channels.some(x=>x.coin===symbol))return toast('This symbol is already taken.');Object.assign(c,{coin:symbol,supply:1000000,prices:[[Date.now(),1]]});toast('Coin symbol saved. Open the market to launch.');}
if(f.id==='upload'){let file=d.get('video'),title=d.get('title').trim();if(!title||!file.type.startsWith('video/'))return toast('Enter a title and choose a video.');f.querySelector('button').disabled=true;try{let db=await dbReady,id=crypto.randomUUID();await new Promise((ok,no)=>{let tx=db.transaction('videos','readwrite');tx.objectStore('videos').put(file,id);tx.oncomplete=ok;tx.onabort=no;});urls[id]=URL.createObjectURL(file);s.clips.push({id,owner:'me',title,likes:0,views:[[Date.now(),0]]});tab=0;go('Profile');toast('Video published.');}catch{f.querySelector('button').disabled=false;return toast('Unable to save this video. Try a smaller file.');}}
save();$('dialog').close();render();});
window.addEventListener('hashchange',()=>{tab=0;render();window.scrollTo(0,0);});render();
function loadShared(){
  return refreshShared().catch(()=>{
    if(path()[0]!=='Profile'||sharedProfileStatus==='ready')toast('Shared videos could not load. Refresh to retry.');
  });
}
if(shared){
  loadShared();
  window.addEventListener('pageshow',event=>{if(event.persisted)loadShared();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('dialog').open)loadShared();});
  setInterval(()=>{if(!document.hidden&&!$('dialog').open)loadShared();},30000);
}else hydrate().catch(()=>toast('This browser cannot store videos.'));
