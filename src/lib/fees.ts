import type {FeeTier} from './model'
export const defaultTiers:FeeTier[]=[{min:0,rate:1},{min:100,rate:.8},{min:500,rate:.6},{min:1000,rate:.4}]
export function fees(active:number,tiers:FeeTier[]){
 const sorted=[...tiers].sort((a,b)=>a.min-b.min)
 const current=sorted.filter(t=>t.min<=active).at(-1)??defaultTiers[0]
 return {current,next:sorted.find(t=>t.min>active),saving:sorted[0].rate-current.rate}
}
