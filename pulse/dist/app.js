'use strict';
const $=q=>document.querySelector(q), pages=['Login','Trending','Search','Clips','Trading','Inbox','Profile'], day=86400000, fmt=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2}), esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const epoch=Date.now(), names=['Tokyo Afterhours','Ocean Motion','Stereo Club','Pasta Studio'], titles=['When I text “almost there”','Trying to make it to Friday','When they hand me the aux','My definition of a little cheese'], tags=['NEON','WAVE','BEAT','PASTA'];
function hist(total,i){return [35,30,7,1,.7,.4,.15,0].map((d,j)=>[epoch-day*d,Math.round(total*[.02,.08,.22,.42,.48,.56,.86,1][j])]);}
function seed(){let channels=names.map((name,i)=>({id:String(i+1),name,coin:tags[i],prices:hist([4.8,3.2,2.1,1.6][i]*100,i).map(([t,v])=>[t,v/100]),supply:1000000,followers:hist(38000/(i+1),i),following:16+i}));return {channels,clips:titles.map((title,i)=>({id:String(i+1),owner:String(i+1),title,views:hist([248600,142800,86400,47200][i],i),likes:4200-i*800})),cash:10000,hold:{},closed:channels.map((c,i)=>({owner:c.id,t:epoch-day*.4,pnl:1200-i*310})),likes:[],saves:[],reposts:[]};}
let s=JSON.parse(localStorage.getItem('pulse-demo-v1')||'null')||seed(), period=0, category=2, metric=0, tab=0,side='buy', query='',observer, uploadDB, urls={},noticeTimer;
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
  const reels=s.clips.filter(c=>matches(c.title,chan(c.owner)?.name,chan(c.owner)?.coin? '$'+chan(c.owner).coin : '',...reelHashtags(c)))
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
  const hashtags=!q&&exploreTab==='all'?'<section class="exploreHashtags"><h2>Trending hashtags</h2><div>'+
    trendingHashtags().map(({name,reels})=>btn(esc(name)+'<small>'+reels+' '+(reels===1?'reel':'reels')+'</small>','hashtag:'+esc(name),'hashtag')).join('')+'</div></section>':'';
  const activity=!q&&exploreTab==='all'?'<section class="demoActivity" aria-labelledby="activityHeading"><h2 id="activityHeading">Recent activity <span class="demoLabel">Demo</span></h2><div id="activityRows">'+activityRows()+'</div></section>':'';
  return activity+hashtags+(visible.length ? visible.map(([,title,rows])=>'<section><h2>'+title+'</h2>'+rows.join('')+'</section>').join('')
    : '<p class="emptyView">'+(q?'No results found.':'Nothing to explore here yet.')+'</p>');
}
function search(section){
  const showLeaderboard=section==='Leaderboard';
  const tabs=viewTabs('Explore categories',[
    ['all','For you'],['reels','Reels'],['channels','Channels'],['traders','Traders'],['coins','Coins'],['leaderboard','Leaderboard']
  ],showLeaderboard?'leaderboard':exploreTab,'explore');
  const content=showLeaderboard?ranks():
    '<label class="exploreField"><span aria-hidden="true">⌕</span><input id="search" type="search" aria-label="Search Pulse" placeholder="Search reels, hashtags, channels, or coins" value="'+esc(query)+'"></label>'+
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
function momentFor(reelId){return s.moments?.[reelId]||demoMoments[reelId];}
function momentBadge(reel){
  const moment=momentFor(reel.id);
  return moment?btn(esc(moment.name),'reelMoment:'+esc(reel.id),'coinPill momentPill'):'';
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
  bot:{text:'Hey! What should Tiny Bot try in the next reel?',offset:-180},
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
  const launches=Object.entries(demoMoments).filter(([reel,moment])=>momentFor(reel)===moment).map(([reel,moment])=>({
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
  modal('<h2>Report reel</h2><form id="reelReport" data-reel="'+esc(reel.id)+'"><label>Reason<select name="reason" required><option value="">Choose a reason</option><option>Spam</option><option>Harassment</option><option>Other</option></select></label><p class="muted">Demo reports are saved on this device.</p><button class="primary">Save report</button></form>');
}
function inbox(id){
  const contacts=s.channels.filter(c=>c.id!=='me'),person=contacts.find(c=>c.id===id);
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
    if(!person||person.id==='me'||!text)return;
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
  return '<div class="reelRail" role="group" aria-label="Reel actions">'+actions.join('')+'</div>';
}
function feed(id){
  const idx=Math.max(0,s.clips.findIndex(c=>c.id===id));
  const items=[...s.clips.slice(idx),...s.clips.slice(0,idx)];
  return '<div class="feed" aria-label="Reels">'+items.map(c=>{
    const ch=chan(c.owner),seeded=Boolean(punchlines[Number(c.id)-1])&&c.owner===c.id;
    const media=c.owner==='me'?'src="'+(urls[c.id]||'')+'"':'poster="media/'+c.id+'.jpg" src="media/'+c.id+'.mp4"';
    const backdrop=seeded?' style="--reel-poster:url(media/'+c.id+'.jpg)"':'';
    const caption=seeded?'<div class="memeCaption"><strong>'+esc(c.title)+'</strong><strong>'+esc(punchlines[Number(c.id)-1])+'</strong></div>':'';
    const hashtags=reelHashtags(c).map(tag=>btn(esc(tag),'hashtag:'+esc(tag),'reelHashtag')).join('');
    const coin=ch.coin?link('$'+esc(ch.coin),'Trading/'+ch.id,'coinPill'):'';
    return '<article class="reel" data-id="'+c.id+'"'+backdrop+'><video playsinline muted loop controls '+media+'></video>'+caption+
      '<button type="button" class="momentGesture" aria-label="Hold to create Moment Coin" title="Hold to create Moment Coin"></button>'+
      '<div class="controls"><div class="byline">'+link(esc(ch.name),'Profile/'+ch.id)+coin+momentBadge(c)+'</div><h3>'+esc(c.title)+'</h3>'+(demoReel(c.id)?'<span class="demoLabel">Demo activity</span>':'')+(hashtags?'<div class="reelHashtags">'+hashtags+'</div>':'')+'</div>'+reelActions(c)+'</article>';
  }).join('')+'</div>';
}
function observe(){observer?.disconnect();const root=$('.feed');if(!root)return;observer=new IntersectionObserver(entries=>entries.forEach(e=>{let v=e.target.querySelector('video');if(e.isIntersecting){v.play().catch(()=>{});let c=clip(e.target.dataset.id);c.views.push([Date.now(),last(c.views)+1]);save();}else v.pause();}),{root,threshold:.65});root.querySelectorAll('article').forEach(el=>observer.observe(el));}
let marketGroup='all';
function momentMarket(){
  const moments=s.clips.filter(reel=>momentFor(reel.id));
  if(!moments.length)return '';
  const rows=moments.map(reel=>{
    const moment=momentFor(reel.id);
    const imageStyle=image(reel);
    const title=esc(moment.name), launcher=esc(moment.launcher||'You');
    return '<button type="button" class="momentMarketRow" data-act="reelMoment:'+esc(reel.id)+'"><span class="assetArt" style="'+imageStyle+'" aria-hidden="true">'+(imageStyle?'':title[0])+'</span>'+
      '<span><strong>'+title+'</strong><small>'+esc(reel.title)+' · Created by '+launcher+'</small></span><span class="momentMarketTime">'+momentTime(moment.time)+'</span></button>';
  }).join('');
  return '<section class="momentMarket"><h2>Moment Coins <span class="demoLabel">Demo</span></h2>'+rows+'</section>';
}
function marketHome(){
  const visible=s.channels.filter(c=>c.coin && (marketGroup==='all'||s.watchlist?.includes(c.id)));
  return '<div class="marketHome"><div class="balanceBlock"><div><small>BSC TESTNET · CHAIN 97</small><h1>Creator coins</h1><p>Choose a creator coin to trade with tBNB.</p></div></div>'+
  '<h2>Creator market</h2><div class="marketTabs">'+[['all','All coins'],['saved','Starred']].map(([k,v])=>chip(v,'group:'+k,k===marketGroup)).join('')+'</div>'+
  visible.map(c=>{const saved=s.watchlist?.includes(c.id);
    return '<div class="assetLine"><button class="assetOpen" data-go="Trading/'+c.id+'"><span class="assetArt" style="'+(c.id!=='me'?'background-image:url(media/'+c.id+'.jpg)':'')+'">'+esc(c.coin[0])+'</span><span class="assetName"><b>$'+esc(c.coin)+'</b><small>' +esc(c.name)+'</small></span><span class="assetPrice"><b>tBNB</b><small>BSC Testnet</small></span></button><button class="star" data-act="watch:'+c.id+'" aria-pressed="'+!!saved+'" aria-label="Starred '+esc(c.coin)+'">'+(saved?'★':'☆')+'</button></div>';
  }).join('')+(visible.length?'':'<p class="emptyMarket">'+(marketGroup==='saved'?'Star a coin to add it to your watchlist.':'No creator coins available.')+'</p>')+momentMarket()+'</div>';
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
  const likes=owned.reduce((total,reel)=>total+reelLikeCount(reel),0);
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
  ['Trading','Trade'],
  ['Search','Explore','M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M15 15l6 6'],
  ['Clips','Reels','M8 4l12 8-12 8z'],
  ['Inbox','Inbox','M3 5h18v13H3z M3 6l9 7 9-7'],
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
    const symbol=route==='Trading'?tradeSymbol:'<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+icon+'"/></svg>';
    return '<a href="#'+route+'" class="dockItem '+(route==='Clips'?'center ':'')+(active?'active':'')+'" '+(active?'aria-current="page"':'')+'><span class="dockIcon">'+symbol+'</span>'+label+'</a>';
  }).join('');
  $('main').innerHTML=({Login:loginScreen,Trending:trending,Search:search,Clips:feed,Trading:trade,Inbox:inbox,Profile:profile})[p](id);observe();paintWallet();
  if(p==='Login')window.pulseWallet.loginPage($('#walletLogin'),()=>go(id==='portfolio'?'Profile':id&&chan(id)?.coin?'Trading/'+id:'Clips'));
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
function openMomentTrade(reel,view='curve'){
  const coin=reel&&momentFor(reel.id);
  if(!coin)return;
  const ledger=momentLedger(), position=momentPosition(ledger,reel.id);
  const reserve=momentReserve(position.sold);
  const complete=position.sold===momentCurveCap;
  const label=esc(coin.name), reelId=esc(reel.id), launcher=esc(coin.launcher||'You'), fills=position.fills||[];
  const imageStyle=image(reel), price=momentBNB(momentPrice(position.sold)), balance=momentBNB(BigInt(ledger.cash));
  modal('<section id="momentTicket" aria-label="Moment Coin trading">'+
    '<div class="momentMarketHeader"><span class="momentLauncherAvatar" aria-hidden="true">'+esc((coin.launcher||'You')[0])+'</span><strong>'+launcher+'</strong><span class="demoLabel">Demo</span></div>'+
    '<div class="momentAsset"><span class="momentAssetArt" aria-hidden="true" style="'+imageStyle+'">'+(imageStyle?'':esc(coin.name[0]))+'</span>'+
    '<div class="momentAssetMeta"><h2>'+label+'</h2>'+btn(esc(reel.title)+' ↗','reelMoment:'+reelId,'subtle')+'</div>'+
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
    try{quote=quoteMoment(momentPosition(momentLedger(),reel.id),event.submitter?.value==='sell'?'sell':'buy',form.elements.quantity.valueAsNumber);}
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
        const execute=()=>settleMoment(reel.id,quote);
        const fill=navigator.locks?await navigator.locks.request(momentTradeStorage,execute):execute();
        if(!status.isConnected||!$('dialog').open)return;
        openMomentTrade(reel,view);
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
  if(momentFor(reel.id))return openMomentTrade(reel);
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
      }else toast('This reel is only available in the browser that uploaded it.');
      return;
    }
    if(navigator.share){
      await navigator.share({title:reel.title,url});return;
    }
  }catch(error){if(error.name==='AbortError')return;}
  if(reel.owner==='me')return toast('Unable to share this video.');
  try{
    await navigator.clipboard.writeText(url);toast('Reel link copied');
  }catch{
    modal('<label>Share reel<input readonly value="'+esc(url)+'"></label>');
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
function openMoment(reel,source){
  if(!reel)return;
  const media=source?.getAttribute('src')||(reel.owner==='me'?urls[reel.id]:'media/'+reel.id+'.mp4');
  if(!media)return toast('This clip is unavailable.');
  const existing=momentFor(reel.id);
  const hasCrop=!existing||Boolean(existing.crop);
  const resume=source&&!source.paused;
  source?.pause();
  const start=existing?.time??source?.currentTime??0;
  modal('<section class="momentSheet"><h2>'+(existing?'Moment Coin':'Create Moment Coin')+'</h2>'+
    '<p class="momentSource">'+esc(reel.title)+' · '+esc(chan(reel.owner).name)+'</p>'+
    '<video class="momentPreview" muted playsinline preload="auto" src="'+esc(media)+'"'+(hasCrop?' hidden':' aria-label="Selected frame"')+'></video>'+
    (hasCrop?'<canvas class="momentCrop" width="512" height="512" '+(existing?'role="img" aria-label="Cropped Moment Coin frame"':'tabindex="0" aria-label="Crop preview" aria-describedby="momentCropHelp"')+'></canvas>':'')+
    (existing?'<h3>'+esc(existing.name)+'</h3><p>'+esc(existing.description)+'</p><p>Frame '+momentTime(existing.time)+' · Created by '+esc(existing.launcher||'You')+'</p><small>Demo Moment Coin</small><div class="momentDetailActions">'+btn('Trade','tradeMoment:'+esc(reel.id),'primary')+'</div>':
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
    const latest=JSON.parse(localStorage.getItem('pulse-demo-v1')||'null');
    s.moments={...s.moments,...latest?.moments};
    if(momentFor(reel.id)){
      status.textContent='This reel already has a Moment Coin. Reopen the clip editor to see it.';return;
    }
    s.moments[reel.id]={name,description,time:Number(track.value),crop:editor.crop,ownerId:reel.owner,clipId:reel.id,launcher:self()?.name||'You'};
    try{save();}catch{delete s.moments[reel.id];status.textContent='Could not save this Moment Coin.';return;}
    source?.closest('.reel')?.querySelector('.byline')?.insertAdjacentHTML('beforeend',momentBadge(reel));
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
function action(str,el){let [k,v,id]=str.split(':');
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
if(k==='tradeMoment')return openMomentTrade(clip(v));
if(k==='reelMoment')return openMoment(clip(v),el.closest('.reel')?.querySelector('video'));
if(k==='reelShare')return shareReel(clip(v));if(k==='reelTrade')return openReelTrade(clip(v),el.closest('.reel')?.querySelector('video'));if(k==='explore'){
  if(v==='leaderboard')return go('Search/Leaderboard');
  exploreTab=v;return go('Search');
}if(k==='group'){marketGroup=v;return render();}

if(k==='watch'){const list=s.watchlist||[];s.watchlist=list.includes(v)?list.filter(x=>x!==v):[...list,v];save();return render();}
if(k==='create')return create();if(k==='channel')return channelForm('profile');if(k==='launch')return modal('<h2>Launch Channel coin</h2><p>Every reel on your channel will link to this coin.</p><form id="launch"><label>Coin symbol (2–8 letters, A–Z)<input required pattern="[A-Za-z]{2,8}" name="symbol"></label><p>Choose a symbol, then open the market to register your coin with your wallet on BSC Testnet.</p><button class="primary">Confirm launch</button></form>');if(k==='toggle'){s[v]=s[v].includes(id)?s[v].filter(x=>x!==id):[...s[v],id];save();el.classList.toggle('selected',s[v].includes(id));el.setAttribute('aria-pressed',String(s[v].includes(id)));
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
document.addEventListener('change',e=>{if(e.target.id==='token')go('Trading/'+e.target.value);});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;$('#exploreResults').innerHTML=exploreResults();}});
const dbReady=new Promise((resolve,reject)=>{let req=indexedDB.open('pulse-clips',1);req.onupgradeneeded=()=>req.result.createObjectStore('videos');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);});
async function hydrate(){let db=await dbReady;let req=db.transaction('videos').objectStore('videos').openCursor();req.onsuccess=()=>{let cur=req.result;if(cur){urls[cur.key]=URL.createObjectURL(cur.value);cur.continue();}else if(['Clips','Profile','Search'].includes(path()[0]))render();};}
document.addEventListener('submit',async e=>{let f=e.target;if(!f.id)return;e.preventDefault();let d=new FormData(f);if(['reelComment','reelReport','inboxMessage'].includes(f.id))return submitSocial(f,d);if(f.id==='channel'){let name=d.get('name').trim();if(!name)return toast('Enter a channel name.');if(!self())s.channels.push({id:'me',name,followers:[[Date.now(),0]],following:0});save();if(f.dataset.next==='create')return create();go('Profile');}
if(f.id==='launch'){let c=self(),symbol=d.get('symbol').toUpperCase();if(c.coin||s.channels.some(x=>x.coin===symbol))return toast('This symbol is already taken.');Object.assign(c,{coin:symbol,supply:1000000,prices:[[Date.now(),1]]});toast('Coin symbol saved. Open the market to launch.');}
if(f.id==='upload'){let file=d.get('video'),title=d.get('title').trim();if(!title||!file.type.startsWith('video/'))return toast('Enter a title and choose a video.');f.querySelector('button').disabled=true;try{let db=await dbReady,id=crypto.randomUUID();await new Promise((ok,no)=>{let tx=db.transaction('videos','readwrite');tx.objectStore('videos').put(file,id);tx.oncomplete=ok;tx.onabort=no;});urls[id]=URL.createObjectURL(file);s.clips.push({id,owner:'me',title,likes:0,views:[[Date.now(),0]]});tab=0;go('Profile');toast('Reel published.');}catch{f.querySelector('button').disabled=false;return toast('Unable to save this video. Try a smaller file.');}}
save();$('dialog').close();render();});
window.addEventListener('hashchange',()=>{tab=0;render();window.scrollTo(0,0);});render();hydrate().catch(()=>toast('This browser cannot store videos.'));
