import assert from 'node:assert/strict'
import {runnerImport} from 'vite'
const lib=async name=>(await runnerImport('./src/lib/'+name+'.ts',{configFile:false})).module
const {initial}=await lib('data')
const {equip,purchase,claimReward,launchGame,sum,roundBNB}=await lib('economy')
const {quote,trade}=await lib('trading')
const {recordSession,refreshActivity}=await lib('sessions')
const {qualifies}=await lib('verification')
const {restore}=await lib('storage')
const state=initial(), game=state.games[0]
const units=state=>roundBNB(state.bnb+sum(state.receipts,'platform')+sum(state.receipts,'developer')+state.games[0].metrics.liquidity)

for(const [active,percent] of [[0,1],[99,1],[100,.8],[499,.8],[500,.6],[999,.6],[1000,.4]]){
 const g={...game,metrics:{...game.metrics,active}}
 assert.equal(quote(g,'Buy',10,state).fee,roundBNB(10*percent/100))
}
const purchased=purchase(state,'ghost')
assert.equal(sum(purchased.receipts,'platform'),.25)
assert.equal(sum(purchased.receipts,'developer'),49.5)
assert.equal(purchased.bnb,50)
assert.equal(purchased.tokens.arena,50)
assert.equal(purchased.games[0].supply,game.supply-.25)
assert.equal(purchase(purchased,'ghost'),purchased)
const poor={...state,bnb:.009,tokens:{arena:0}}
assert.equal(purchase(poor,'diamond'),poor)
assert.equal(equip(poor,'ghost'),poor)
assert.equal(equip(purchased,'ghost').skin,'ghost')
assert.deepEqual(purchase(state,'founder').owned,['founder','diamond'])
const buy=trade(state,'arena','Buy',1)
const sell=trade(buy,'arena','Sell',buy.tokens.arena)
assert.equal(units(buy),units(state))
assert.equal(units(sell),units(state))
assert.equal(sell.tokens.arena,0)
assert.equal(trade(state,'arena','Sell',101),state)
assert.equal(trade(state,'arena','Buy',51),state)
assert.equal(trade(state,'arena','Buy',NaN),state)
const listing={...game,id:'new-game',ticker:'NEW'}
const listed=launchGame(state,listing)
assert.equal(listed.bnb,49.95)
assert.equal(sum(listed.receipts,'platform'),.05)
assert.equal(launchGame(listed,listing),listed)
assert.equal(launchGame(poor,listing),poor)
const claimed=claimReward(state,'arena','first100')
assert.equal(claimed.rewardPool,49900)
assert.equal(claimReward(claimed,'arena','first100'),claimed)
const empty={...state,rewardPool:0}
assert.equal(claimReward(empty,'arena','first100'),empty)
const now=Date.now()
const start={id:'run1',account:state.player,at:now,activeSeconds:0,seconds:0,coins:0,actions:0,outcome:'In progress',events:[]}
const finished={...start,activeSeconds:30,seconds:60,actions:20,coins:3,outcome:'Victory'}
for(const change of [{activeSeconds:29},{actions:19},{coins:2},{outcome:'Abandoned'},{outcome:'In progress'}])assert.equal(qualifies({...finished,...change}),false)
const g1=recordSession(recordSession(game,start),finished)
assert.equal(recordSession(g1,finished),g1)
const expired=refreshActivity({...state,games:[g1]},now+86400000).games[0]
assert.equal(expired.metrics.active,game.metrics.active)
assert.equal(expired.metrics.unique,game.metrics.unique+1)
const repeat={...start,id:'run2',at:now+86400020}
const g2=recordSession(recordSession(expired,repeat),{...finished,id:repeat.id,at:repeat.at})
assert.equal(g2.metrics.active,game.metrics.active+1)
assert.equal(g2.metrics.unique,game.metrics.unique+1)
const legacy={...state,games:[{...game,sessions:[{id:'v1',account:'local-demo-player',at:now,seconds:12,coins:2,actions:8}],rolling:{'local-demo-player':now}}]}
delete legacy.player
const upgraded=restore(JSON.stringify(legacy))
assert(upgraded.games[0].sessions[0].legacyVerified)
assert.equal(upgraded.games[0].sessions[0].account,upgraded.player)
assert.equal(qualifies(upgraded.games[0].sessions[0]),false)
assert.equal(sum(upgraded.receipts,'platform'),0)
console.log('Passed fee boundaries, ledger conservation, duplicate and insufficient purchases, rewards, session thresholds, expiry and v1 compatibility.')
