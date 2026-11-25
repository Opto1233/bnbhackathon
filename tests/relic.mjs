import assert from 'node:assert/strict'
import {database} from '../server/local.mjs'
import {market} from '../server/market.js'
const db=database(),url='https://rofun.test'
async function api(role,data,user='mentor'){
 const r=await market(new Request(url+'/api/relic?mode=mentor&role='+encodeURIComponent(role),{method:data?'POST':'GET',headers:{origin:url,'content-type':'application/json','oai-authenticated-user-id':user},body:data?JSON.stringify(data):undefined}),db)
 return {status:r.status,...await r.json()}
}
let s=await api('Seller',{action:'starter'})
const item=s.items[0].id
assert.equal((await api('Buyer B',{action:'list',item,price:1000000})).status,409)
s=await api('Seller',{action:'list',item,price:3000000})
assert.equal((await api('Buyer A',{action:'offer',id:s.listings[0].id,price:3000000})).status,409)
await api('Seller',{action:'cancel',id:s.listings[0].id})
s=await api('Seller',{action:'list',item,price:1000000})
const id=s.listings[0].id
const offer={action:'offer',id,price:1000000}
assert.equal((await api('Buyer A',{...offer,price:1})).status,409)
assert.equal((await api('Seller',offer)).status,409)
const roles=['Buyer A','Buyer B']
const requests=await Promise.all(roles.map(r=>api(r,offer)))
assert(requests.every(r=>r.status===200&&r.balance===2000000&&r.items.length===0))
const buys=requests.map(r=>({action:'buy',id,price:1000000,offerId:r.offers[0].offerId}))
assert.equal((await api('Buyer A',offer)).status,409)
assert.equal((await api('Buyer A',buys[0])).status,409)
assert.equal((await api('Buyer A',{action:'approve',id:buys[0].offerId})).status,409)
assert.equal((await api('Buyer B',buys[0])).status,409)
for(const buy of buys)assert.equal((await api('Seller',{action:'approve',id:buy.offerId})).status,200)
assert.equal((await api('Buyer A',buys[0])).status,409)
await new Promise(resolve=>setTimeout(resolve,3100))
const res=await Promise.all(roles.map((r,i)=>api(r,buys[i])))
assert.deepEqual(res.map(r=>r.status).sort(),[200,409])
const winnerIndex=res.findIndex(r=>r.status===200)
const winner=roles[winnerIndex]
assert.equal((await api(winner,buys[winnerIndex])).balance,1000000)
assert.equal((await api(winner)).items[0].id,item)
assert.equal((await api(winner)).items[0].lastPrice,1000000)
assert.equal((await api('Seller')).balance,2990000)
assert.deepEqual((await api('Seller')).totals,{sales:1,volume:1000000,platform:5000,burned:5000})
assert.equal((await api('Seller',undefined,'another')).totals.sales,0)
console.log('Passed escrow, insufficient funds, ownership, quote, race, replay, allocation and isolation checks.')
const originalNow=Date.now
try{
 let clock=originalNow()
 Date.now=()=>clock
 const secondItem=(await api('Seller',{action:'starter'},'expiry-room')).items[0].id
 const second=(await api('Seller',{action:'list',item:secondItem,price:1000000},'expiry-room')).listings[0]
 const o=(await api('Buyer A',{action:'offer',id:second.id,price:second.price},'expiry-room')).offers[0]
 await api('Seller',{action:'approve',id:o.offerId},'expiry-room')
 clock+=300001
 const expired=await api('Buyer A',undefined,'expiry-room')
 assert.equal(expired.offers.length,0)
 assert.equal(expired.expiredOffers[0].offerId,o.offerId)
 assert.equal((await api('Buyer A',{action:'buy',id:second.id,price:second.price,offerId:o.offerId},'expiry-room')).status,409)
 assert.equal((await api('Buyer A',undefined,'expiry-room')).balance,2000000)
 assert.equal((await api('Buyer A',{action:'offer',id:second.id,price:second.price},'expiry-room')).status,200)
}finally{Date.now=originalNow}
console.log('Expired requests retain their reason, preserve the balance and allow a fresh request.')
