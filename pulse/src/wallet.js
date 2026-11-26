import { shared } from './shared.js';
window.pulseShared = shared;
import { BrowserProvider, JsonRpcProvider, FallbackProvider, Contract, getCreate2Address, id, keccak256, concat, formatEther, verifyMessage, hexlify, randomBytes } from 'ethers';
import market from './market.json';
const rpc='https://bsc-testnet-rpc.publicnode.com', explorer='https://testnet.bscscan.com';
const factory='0x4e59b44847b379578588920cA78FbF26c0B4956C';
const proxyCode='0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3';
const salt=id('Pulse Bangkok creator market v1'),address=getCreate2Address(factory,salt,keccak256(market.bytecode));
const reader=new FallbackProvider([rpc,'https://data-seed-prebsc-1-s1.bnbchain.org:8545'].map((url,i)=>({
  provider:new JsonRpcProvider(url,97,{staticNetwork:true,batchMaxCount:1}), priority:i+1,weight:1,stallTimeout:1500
})),97,{quorum:1});
const marketRead=new Contract(address,market.abi,reader);
const legacy=new Contract('0xdaB865af904e739e55A4b0510CF4FE379E7f8B23',market.abi,reader);
const legacyHash='0x2bd4640e4c188025e4753544da74e0443c4e71c528a6c93cc7e7ec7cc109f692';
let legacyAvailable;
async function marketFor(key){
  if(legacyAvailable===undefined) legacyAvailable=keccak256(await reader.getCode(legacy.target))===legacyHash;
  return key && legacyAvailable && await legacy.listed(key) ? legacy : marketRead;
}
let wallet,account,sessionUntil=0,version=0,working=false;
const wallets=new Map();
window.addEventListener('eip6963:announceProvider',e=>wallets.set(e.detail.provider,e.detail.info.name));
window.dispatchEvent(new Event('eip6963:requestProvider'));
const node=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
const pretty=x=>formatEther(x).replace(/(\.\d{9})\d+$/,'$1');
function clear(){sessionStorage.removeItem("pulse:wallet-session");shared?.logout();account=null;sessionUntil=0;version++;refresh();}
function signed(){return account&&Date.now()<sessionUntil;}
function use(provider){
  if(wallet!==provider){wallet?.removeListener?.('accountsChanged',clear);wallet?.removeListener?.('chainChanged',clear);wallet=provider;wallet.on?.('accountsChanged',clear);wallet.on?.('chainChanged',clear);}
}
async function login(provider){
  use(provider);
  await provider.request({method:'eth_requestAccounts'});
  if(BigInt(await provider.request({method:'eth_chainId'}))!==97n){
    const switchToTestnet=()=>provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x61'}]});
    try{await switchToTestnet();}
    catch(e){
      if(Number(e.code)!==4902&&Number(e.data?.originalError?.code)!==4902)throw e;
      await provider.request({method:'wallet_addEthereumChain',params:[{chainId:'0x61',chainName:'BSC Testnet',nativeCurrency:{name:'Test BNB',symbol:'tBNB',decimals:18},rpcUrls:[rpc],blockExplorerUrls:[explorer]}]});
      if(BigInt(await provider.request({method:'eth_chainId'}))!==97n)await switchToTestnet();
    }
  }
  const signer=await new BrowserProvider(provider).getSigner(),addr=await signer.getAddress();
  const msg=location.host+' wants you to sign in with your Ethereum account:\n'+addr+'\n\nSign in to trade Pulse creator coins on BSC Testnet.\n\nURI: '+location.origin+'\nVersion: 1\nChain ID: 97\nNonce: '+hexlify(randomBytes(16)).slice(2)+'\nIssued At: '+new Date().toISOString();
  const signature=await signer.signMessage(msg);
  if(verifyMessage(msg,signature)!==addr||BigInt(await provider.request({method:'eth_chainId'}))!==97n)throw Error('Wallet or network changed.');
  if(shared){
    await shared.login(msg,signature);
    const current=await provider.request({method:'eth_accounts'});
    if(current[0]?.toLowerCase()!==addr.toLowerCase()||BigInt(await provider.request({method:'eth_chainId'}))!==97n){
      clear();throw Error('Wallet changed. Sign in again.');
    }
  }
  account=addr;sessionUntil=Date.now()+3600000;
  sessionStorage.setItem('pulse:wallet-session',JSON.stringify({addr,until:sessionUntil}));
}
async function signerNow(){
  if(!signed()||BigInt(await wallet.request({method:'eth_chainId'}))!==97n)throw Error('Please sign in on BSC Testnet.');
  const signer=await new BrowserProvider(wallet).getSigner();if(await signer.getAddress()!==account)throw Error('Wallet changed. Sign in again.');return signer;
}
async function ready(contract=marketRead){if(contract===legacy)return true;const code=await reader.getCode(address);if(code==='0x')return false;if(code!==market.runtime)throw Error('Market bytecode mismatch.');return true;}
function refresh(){window.dispatchEvent(new Event('pulse-wallet-change'));}
const tokenId=c=>c.walletId || (c.id==='me'?null:c.id);
async function portfolio(root,creators){
  root.replaceChildren(node('h2','Your portfolio'));
  const body=node('div','');root.append(body);
  if(!signed()){const sign=node('a','Sign in to see holdings');sign.href='#Login/portfolio';body.append(sign);return;}
  const owner=account;
  body.textContent='Loading holdings…';
  try{
    const blockTag=await reader.getBlockNumber(),options={blockTag};
    const cash=await reader.getBalance(owner,blockTag);
    const balances=await Promise.all(creators.filter(c=>tokenId(c)&&c.coin).map(async c=>{
      const key=tokenId(c), contract=await marketFor(key);
      if(!await ready(contract)) return null;
      const qty=await contract.balanceOf(owner,key,options);
      if(!qty)return null;
      const supply=await contract.supply(key,options);
      const [before,after]=await Promise.all([contract.reserve(supply,options),contract.reserve(supply-qty,options)]);
      return {c,qty,value:before-after};
    }));
    const rows=balances.filter(Boolean);
    if(!body.isConnected||owner!==account)return;
    const total=rows.reduce((sum,r)=>sum+r.value,cash);
    body.replaceChildren(node('strong',pretty(total)+' tBNB'),node('p','Wallet cash: '+pretty(cash)+' tBNB'));
    if(!rows.length)body.append(node('small','No Pulse creator coins held.'));
    else body.append(node('small','Holdings valued at their sell quote before gas.'));
    for(const {c,qty,value} of rows){const row=node('a',qty+' $'+c.coin+' · '+pretty(value)+' tBNB');row.href='#Trading/'+encodeURIComponent(c.id);body.append(row);}
  }catch{body.textContent='Unable to load wallet balances. ';const retry=node('button','Retry');retry.onclick=()=>portfolio(root,creators);body.append(retry);}
}
function drawPrices(root,values){
  const canvas=node('canvas','');canvas.width=640;canvas.height=160;canvas.style.width='100%';canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Trade prices from '+values[0]+' to '+values.at(-1)+' tBNB per coin');
  const ctx=canvas.getContext('2d'),lo=Math.min(...values),hi=Math.max(...values);
  ctx.strokeStyle='#35373a';for(const y of [18,80,142]){ctx.beginPath();ctx.moveTo(4,y);ctx.lineTo(636,y);ctx.stroke();}
  ctx.strokeStyle='#d6fa44';ctx.lineWidth=4;ctx.beginPath();
  values.forEach((v,i)=>{const x=8+i*624/Math.max(1,values.length-1),y=hi===lo?80:142-(v-lo)*124/(hi-lo);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);if(values.length===1)ctx.arc(x,y,3,0,2*Math.PI);});ctx.stroke();root.append(canvas);
}
async function priceHistory(root,key){
  root.replaceChildren(node('h3','Trade price'),node('small','Loading on-chain trades…'));
  try{
    const contract=await marketFor(key), exists=await ready(contract);
    let logs=[];
    if(exists&&key){const end=await reader.getBlockNumber();logs=await contract.queryFilter(contract.filters.Trade(key),Math.max(0,end-999),end);}
    root.replaceChildren(node('h3','Trade price'));
    if(!logs.length){
      root.append(node('p',exists?'No trades in the last 1,000 blocks.':'No trades yet. The testnet market has not launched.'));
      if(key){
        const start=exists?await contract.supply(key):0n;
        root.append(node('h4','Projected buy price'));
        // One-unit buy quote from Pulse.reserve(n + 1) - Pulse.reserve(n).
        const previews=[0,25,50,75,100].map(n=>Number(formatEther(1000000000000n+1000000000n*(2n*(start+BigInt(n))+1n))));
        drawPrices(root,previews);
        root.querySelector('canvas').setAttribute('aria-label','Projected unit buy price over the next hundred coins issued.');
        root.append(node('small','Next 100 coins issued · '+previews[0]+' to '+previews.at(-1)+' tBNB'));
      }
      return;
    }
    const values=logs.map(e=>Number(formatEther(e.args.amount/e.args.quantity)));
    drawPrices(root,values);root.append(node('small','Latest: '+values.at(-1)+' tBNB per coin · trades in the last 1,000 blocks'));
  }catch{root.replaceChildren(node('h3','Trade price'),node('p','Price history is unavailable.'));const retry=node('button','Retry chart');retry.onclick=()=>priceHistory(root,key);root.append(retry);}
}
async function marketSnapshot(creators){
  const rows=new Map();
  const blockTag=await reader.getBlockNumber();
  await Promise.allSettled(creators.map(async creator=>{
    const key=tokenId(creator),contract=await marketFor(key),listedMarket=await ready(contract);
    if(!listedMarket||!key||!await contract.listed(key,{blockTag})){
      rows.set(creator.id,{status:'Market not launched'});
      return;
    }
    const [supply,logs]=await Promise.all([
      contract.supply(key,{blockTag}),contract.queryFilter(contract.filters.Trade(key),Math.max(0,blockTag-999),blockTag)
    ]);
    const reserves=await Promise.all([contract.reserve(supply+1n,{blockTag}),contract.reserve(supply,{blockTag})]);
    const price=reserves[0]-reserves[1];
    const fills=logs.filter(log=>log.args.id===BigInt(key)).map(({args})=>({
      side:args.bought?'buy':'sell', amount:args.amount, quantity:args.quantity
    }));
    rows.set(creator.id,{marketCap:formatEther(price*supply),holders:supply<=1n?Number(supply):null,top10:supply>0n&&supply<=10n?'100%':null,fills,format:formatEther});
  }));
  return rows;
}
function panel(root,creator,side){
  const current=++version;
  const status=node('p',''),actions=node('div',''),info=node(root.id==='reelTicket'?'div':'p','');
  const token=tokenId(creator);
  root.replaceChildren(node('h2','$'+creator.coin),node('small','BSC Testnet · Chain 97'),info,actions,status);
  const chart=node('section','');chart.className='priceHistory';root.insertBefore(chart,info);priceHistory(chart,token);
  const faucet=node('a','Get test tBNB');faucet.href='https://docs.bnbchain.org/bnb-smart-chain/developers/faucet/';faucet.target='_blank';faucet.rel='noopener';root.append(faucet);
  const txKey='pulse:lastTx:97:'+account+':'+creator.id;
  const lastTx=sessionStorage.getItem(txKey);if(/^0x[0-9a-f]{64}$/i.test(lastTx||'')){const receipt=node('a','Latest transaction ↗');receipt.href=explorer+'/tx/'+lastTx;receipt.target='_blank';receipt.rel='noopener';root.append(receipt);}
  const sheet=root.id==='reelTicket';
  if(sheet){
    actions.className='creatorActions';
    root.append(status,actions);
  }
  function sheetStat(label,value){
    const row=node('div','');
    row.className='creatorStat';
    row.append(node('small',label),node('strong',value));
    info.append(row);
  }
  function button(label,fn){const b=node('button',label);actions.append(b);b.onclick=async()=>{if(working)return;working=true;status.textContent='Waiting…';try{await fn();}catch(e){status.textContent=e.code===4001||e.code==='ACTION_REJECTED'?'Wallet request canceled.':String(e.shortMessage||e.message||e).slice(0,200);}finally{working=false;}};return b;}
  async function receipt(tx){sessionStorage.setItem(txKey,tx.hash);const a=node('a','Pending transaction ↗');a.href=explorer+'/tx/'+tx.hash;a.target='_blank';a.rel='noopener';status.replaceChildren(a);await tx.wait(1);refresh();}
  if(!signed()){
    info.textContent='Sign in with your wallet to buy or sell. Network fees use test tBNB.';
    button('Sign in with wallet',async()=>{root.closest('dialog')?.close();location.hash='Login/'+encodeURIComponent(creator.id);});
    return;
  }
  info.textContent=account.slice(0,6)+'…'+account.slice(-4);status.textContent='Loading market…';
  (async()=>{
    const selected=await marketFor(token);
    const [exists,balance]=await Promise.all([ready(selected),reader.getBalance(account)]);
    if(current!==version||!root.isConnected)return;
    if(sheet)sheetStat('Wallet balance',pretty(balance)+' tBNB');
    else info.textContent+=' · '+pretty(balance)+' tBNB';
    status.textContent='';
    if(!exists){status.textContent='One-time shared market deployment required. Your wallet pays testnet gas.';button('Deploy testnet market',async()=>{const signer=await signerNow();if(await reader.getCode(factory)!==proxyCode)throw Error('Deployment proxy mismatch.');if(await ready()){refresh();return;}await receipt(await signer.sendTransaction({to:factory,data:concat([salt,market.bytecode]),chainId:97}));});return;}
    let key=token||account;
    if(!await selected.listed(key)){
      status.textContent='This creator has not opened the market yet.';
      if((creator.id==='me'||creator.id===shared?.userId)&&(!token||token.toLowerCase()===account.toLowerCase()))button('Launch wallet creator coin',async()=>{const contract=selected.connect(await signerNow());const owner=account;const tx=await contract.launch({chainId:97});await receipt(tx);window.dispatchEvent(new CustomEvent('pulse-creator-linked',{detail:owner}));});
      return;
    }
    if(!token&&creator.id==='me'){window.dispatchEvent(new CustomEvent('pulse-creator-linked',{detail:account}));return;}
    const owned=await selected.balanceOf(account,key),nSold=await selected.supply(key),unit=(await selected.reserve(nSold+1n))-(await selected.reserve(nSold));
    if(current!==version||!root.isConnected)return;
    info.append(node('small',selected===legacy?'Legacy demo market · uncapped supply':'Demo supply cap · 1,000,000 coins'));
    if(sheet){
      sheetStat('Your coins',owned+' $'+creator.coin);
      const price=node('div','');
      price.className='creatorUnitPrice';
      price.append(node('strong',pretty(unit)),node('small','tBNB per coin'));
      chart.before(price);
    }else{
      info.textContent+=' · '+owned+' $'+creator.coin;
      actions.append(node('p','Next coin · '+pretty(unit)+' tBNB'));
    }
    const qty=node('input','');Object.assign(qty,{type:'number',min:'1',max:'1000000',step:'1',value:'1'});const label=node('label','Creator coins');label.append(qty);actions.append(label);
    for(const buy of (side?[side==='buy']:[true,false]))button(buy?'Buy':'Sell',async()=>{
      if(!qty.reportValidity()||!qty.value)return;const n=BigInt(qty.value);if(!buy&&n>owned)throw Error('Insufficient creator coins.');
      const amount=await selected.quote(key,n,buy);actions.replaceChildren(node('p',(buy?'Buy ':'Sell ')+n+' $'+creator.coin+' · '+pretty(amount)+' tBNB + network gas'));
      button('Confirm in wallet',async()=>{const c=selected.connect(await signerNow());const tx=buy?await c.buy(key,n,{value:amount,chainId:97}):await c.sell(key,n,amount,{chainId:97});await receipt(tx);});
      button('Back',async()=>refresh());status.textContent='';
    }).className=buy?'tradeBuy':'tradeSell';
  })().catch(e=>{status.textContent='Could not load testnet market: '+(e.shortMessage||e.message);button('Retry',async()=>refresh());});
}
function loginError(error){
  const code=error.code;
  const message=error.message||'';
  if(Number(code)===4001||code==='ACTION_REJECTED')return 'Sign-in canceled. You can try again or browse as a guest.';
  if(Number(code)===-32002)return 'Open MetaMask and finish the pending sign-in request.';
  if(/URI which is not allowed|Domain that does not match/i.test(message))return 'This Pulse address is not enabled for wallet sign-in. Ask your project owner to add it to Supabase Authentication.';
  if(code==='web3_provider_disabled')return 'Ethereum wallet sign-in is disabled for this Pulse project.';
  if(/Wallet (or network )?changed/i.test(message))return 'Your wallet or network changed. Select BSC Testnet and try again.';
  return 'Could not sign in. Unlock MetaMask, check that BSC Testnet is selected, and try again.';
}

function loginPage(root,complete){
  root.replaceChildren();
  if(signed()){
    root.append(node('p','Signed in as '+account.slice(0,6)+'…'+account.slice(-4)));
    const logout=node('button','Sign out');logout.onclick=clear;root.append(logout);return;
  }
  if(!wallets.size&&window.ethereum)wallets.set(window.ethereum,'Browser wallet');
  const status=node('p','');status.setAttribute('role','status');
  if(!wallets.size)status.textContent='Open Pulse in your wallet’s browser or enable a browser wallet extension to sign in.';
  for(const [provider,name] of wallets){
    const b=node('button','Continue with '+name);b.className='primary';
    b.onclick=async()=>{
      if(working)return;
      working=true;b.disabled=true;status.textContent='Confirm the sign-in message in your wallet.';
      try{await login(provider);if(location.hash.startsWith('#Login'))complete();refresh();}
      catch(e){status.textContent=loginError(e);}
      finally{working=false;b.disabled=false;}
    };root.append(b);
  }
  root.append(status);
}
window.pulseWallet={panel,address,loginPage,signed,account:()=>signed()?account:null,portfolio,marketSnapshot};

async function restoreWallet(){
  try{
    const entry=JSON.parse(sessionStorage.getItem('pulse:wallet-session')||'null');
    if(!entry || entry.until<=Date.now())return;
    for(const provider of new Set([...wallets.keys(),window.ethereum].filter(Boolean))){
      const [address]=await provider.request({method:'eth_accounts'});
      if(address?.toLowerCase()!==entry.addr.toLowerCase()||BigInt(await provider.request({method:'eth_chainId'}))!==97n)continue;
      if(shared&&!await shared.restore(address))return;
      if(account)return;
      use(provider);account=entry.addr;sessionUntil=entry.until;refresh();return;
    }
  }catch{ /* A disconnected wallet can sign in again. */ }
}
window.pulseWallet.restored=restoreWallet();
