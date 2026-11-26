import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const storage=new Map();
let wallet=null;
const page=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const boot=page.indexOf("window.addEventListener('hashchange'");
assert.ok(boot>0);
const context=vm.createContext({
  assert,structuredClone,console,
  window:{pulseShared:{get userId(){return wallet;}},PULSE_CONFIG:{url:'test'},
    pulseWallet:{signed:()=>Boolean(wallet),account:()=>wallet},addEventListener(){}},
  document:{addEventListener(){}},location:{hash:'#Search'},setInterval(){},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}
});
vm.runInContext(page.slice(0,boot),context);
vm.runInContext(`
for(let i=1;i<=1000;i++){
  const odd=Boolean(i%2),owner='owner-'+i,id='clip-'+i,name='Studio '+i;
  const channel={id:owner,name,coin:'COIN',shared:true,following:0,followers:[]};
  const now=Date.now(),title='Episode '+i,views=[[now-5*day,10],[now,20]];
  const reel={id,owner,title,shared:true,media:'video.mp4',likes:0,views,createdAt:now};
  const older={...reel,id:id+'-old',title:'Pilot '+i,createdAt:now-day};
  s={...seed(),channels:[channel],clips:[older,reel],moments:{[id]:[{name:'Moment '+i}]},profileFollows:{me:odd?[owner]:[]}};
  exploreTab='coins';query=odd?'Moment '+i:name;
  assert.doesNotMatch(exploreResults(),/No results found/);
  exploreTab='channels';query=odd?'@'+handleFor(channel):name;
  assert.doesNotMatch(exploreResults(),/No results found/);
  const tag=(odd?'#เที่ยว':'#Travel')+i;
  assert.equal(reelHashtags({...reel,title:tag})[0],tag);
  const grid=profile(owner);
  assert.ok(grid.indexOf('aria-label="Play '+title+'"')<grid.indexOf('aria-label="Play '+older.title+'"'));
  query=name;
  assert.match(exploreResults(),new RegExp('<small>'+Number(odd)+' followers'));
  assert.equal(feed(odd?id:id+'-removed').match(/data-id="([^"]+)"/)?.[1],odd?id:undefined);
  const prior=i*7,delta=i,history=odd?[[now,prior+delta]]:[[now-2*day,prior],[now,prior+delta]];
  assert.equal(stats(history,now-day).delta,odd?null:delta);
  const sold=(i*421)%490000,qty=i*3;
  const expected=BigInt(qty)*(4000000000n+8000n*BigInt(sold))+4000n*BigInt(qty)**2n;
  assert.equal(quoteMoment({sold,owned:sold},'buy',qty).amount,expected);
  const total=odd?500000:499999;
  assert.equal(quoteMoment({sold:total,owned:total},'sell',i).quantity,i);
  const seconds=Math.floor(i/20)*60+59+(i%20)*.0002+(odd?.996:.97),cs=Math.round(seconds*100);
  assert.equal(momentTime(seconds),Math.floor(cs/6000)+':'+((cs%6000)/100).toFixed(2).padStart(5,'0'));
}
assert.equal(initial('👩‍💻 Mina'),'👩‍💻');
assert.equal(stats(null).delta,null);
assert.equal(stats([[Date.now(),'bad'],['bad',4]]).delta,null);
`,context);
vm.runInContext(`
s=seed();
s.channels.push({id:'bot',name:'Pulse Workshop',followers:[]});
s.clips.push({id:'bot',owner:'bot'});
s.moments={bot:[structuredClone(demoMoments.bot),{id:'custom',name:'New market'}]};
const beforeSample=JSON.stringify(momentLedger());
const simulated=sampleTrades('moment-bot',demoStartedAt+18_000+3*98_000);
assert.equal(simulated.length,4);
assert.deepEqual(simulated.map(trade=>trade.side),['sell','sell','buy','buy']);
assert.equal(simulated[0].actor,simulated[2].actor);
assert.equal(simulated[1].actor,simulated[3].actor);
assert.ok(Math.abs(simulated[0].amount+simulated[1].amount-simulated[2].amount-simulated[3].amount)<1e-12);
assert.equal(sampleTrades('moment-custom',demoStartedAt).length,0);
assert.equal(sampleTrades('saved',demoStartedAt).length,0);
s.watchlist=['moment-bot'];
assert.equal(sampleTrades('saved',demoStartedAt).length,4);
assert.match(sampleTradeFeed('moments'),/Simulated trades by fictional accounts/);
assert.equal(JSON.stringify(momentLedger()),beforeSample);
`,context);
vm.runInContext(`
s.messages={bot:[{text:'<hello>',time:demoStartedAt-600000}]};
const chatMarkup=inbox('bot');
assert.ok(chatMarkup.indexOf('chatBubble incoming')<chatMarkup.indexOf('chatBubble outgoing'));
assert.match(chatMarkup,/&lt;hello&gt;/);
assert.match(chatMarkup,/class="chatDate" hidden/);
const dateChip={hidden:true,textContent:''};
const history={scrollTop:0,scrollHeight:500,clientHeight:200,
  getBoundingClientRect:()=>({top:0}),
  querySelectorAll:()=>[{getBoundingClientRect:()=>({bottom:80-history.scrollTop}),dataset:{chatDate:'November 25, 2026'}},
    {getBoundingClientRect:()=>({bottom:500-history.scrollTop}),dataset:{chatDate:'November 26, 2026'}}],
  addEventListener(type,callback){this.onScroll=callback;}};
document.querySelector=selector=>selector==='.inboxThread'?history:dateChip;
mountChatHistory();
assert.equal(dateChip.hidden,true);
history.scrollTop=0;history.onScroll();
assert.equal(dateChip.hidden,false);
assert.equal(dateChip.textContent,'November 25, 2026');
history.scrollTop=120;history.onScroll();
assert.equal(dateChip.textContent,'November 26, 2026');
history.scrollTop=300;history.onScroll();
assert.equal(dateChip.hidden,true);
`,context);
wallet='alice';
vm.runInContext(`switchAccount();s.messages={bob:[{text:'private draft'}]};save();
const firstBuy=quoteMoment({sold:0,owned:0},'buy',100000);
assert.equal(momentBNB(firstBuy.amount),'0.044');
settleMoment('first-coin',firstBuy);`,context);
wallet='bob';
vm.runInContext(`switchAccount();assert.equal(Object.keys(s.messages).length,0);assert.equal(momentPosition(momentLedger(),'first-coin').owned,0);`,context);
wallet='alice';
vm.runInContext(`switchAccount();assert.equal(s.messages.bob[0].text,'private draft');
const firstPosition=momentPosition(momentLedger(),'first-coin');
assert.equal(firstPosition.owned,100000);assert.ok(firstPosition.fills[0].time);
settleMoment('first-coin',quoteMoment(firstPosition,'sell',100000));
assert.equal(momentBNB(BigInt(momentLedger().cash)),'10');`,context);
console.log('10,000 UI and pricing cases passed, plus account isolation and a demo buy/sell round trip.');
