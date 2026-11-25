import type {Game,State} from './model'
import {fees} from './fees'
import {roundBNB,receipt} from './economy'
export function quote(g:Game,side:'Buy'|'Sell',amount:number,state:State){
 const percent=fees(g.metrics.active,state.tiers).current.rate
 const reserve=g.metrics.liquidity
 const tokens=reserve/g.price
 const buy=side==='Buy'
 const gross=roundBNB(buy?amount:reserve*amount/(tokens+amount))
 const fee=roundBNB(gross*percent/100)
 const net=roundBNB(gross-fee)
 const output=buy?tokens*net/(reserve+net):net
 const ideal=buy?net/g.price:amount*g.price*(1-percent/100)
 const balance=buy?state.bnb:state.tokens[g.id]??0
 const valid=Number.isFinite(output)&&reserve>0&&gross>0&&net>0&&amount>0&&amount<=balance&&(!buy||Math.abs(amount-gross)<1e-14)
 return {output,fee,gross,percent,impact:ideal?100*(1-output/ideal):0,valid}
}
export function trade(state:State,id:string,side:'Buy'|'Sell',amount:number,receiptId?:string,preview?:ReturnType<typeof quote>):State{
 const g=state.games.find(item=>item.id===id)
 if(!g||receiptId&&state.receipts.some(r=>r.id===receiptId))return state
 const q=quote(g,side,amount,state)
 if(!q.valid||preview&&(preview.output!==q.output||preview.fee!==q.fee))return state
 const buy=side==='Buy'
 const delta=buy?roundBNB(q.gross-q.fee):-q.gross
 const liquidity=roundBNB(g.metrics.liquidity+delta)
 const price=g.price*Math.pow(liquidity/g.metrics.liquidity,2)
 const entry=receipt(state,id,'Trade',side+' '+g.ticker,q.gross,q.fee)
 if(receiptId)entry.id=receiptId
 return {...state,bnb:roundBNB(state.bnb+(buy?-q.gross:q.output)),tokens:{...state.tokens,[id]:(state.tokens[id]??0)+(buy?q.output:-amount)},receipts:[entry,...state.receipts],trades:[{id:entry.id,game:id,side,amount,output:q.output,fee:q.fee,at:entry.at},...state.trades],games:state.games.map(item=>item.id===id?{...item,price,history:[...item.history,price].slice(-50),volume:item.volume+q.gross*600,cap:price*600*item.supply,metrics:{...item.metrics,liquidity}}:item)}
}
