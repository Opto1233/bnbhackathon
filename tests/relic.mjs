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
assert.equal((await api('Buyer A',{action:'buy',id:s.listings[0].id,price:3000000})).status,409)
await api('Seller',{action:'cancel',id:s.listings[0].id})
s=await api('Seller',{action:'list',item,price:1000000});const id=s.listings[0].id
const buy={action:'buy',id,price:1000000}
assert.equal((await api('Buyer A',{...buy,price:1})).status,409)
assert.equal((await api('Seller',buy)).status,409)
const roles=['Buyer A','Buyer B']
const res=await Promise.all(roles.map(r=>api(r,buy)))
assert.deepEqual(res.map(r=>r.status).sort(),[200,409])
const winner=roles[res.findIndex(r=>r.status===200)]
assert.equal((await api(winner,buy)).balance,1000000)
assert.equal((await api(winner)).items[0].id,item)
assert.equal((await api('Seller')).balance,2990000)
assert.deepEqual((await api('Seller')).totals,{sales:1,volume:1000000,platform:5000,burned:5000})
assert.equal((await api('Seller',undefined,'another')).totals.sales,0)
console.log('Passed escrow, insufficient funds, ownership, quote, race, replay, allocation and isolation checks.')
