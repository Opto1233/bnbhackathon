import type {Game} from './model'
import {verification} from './verification'
export const ranges=['5 min','30 min','1 hour','24 hours','7 days','30 days']
export function analytics(g:Game){
 const {raw,score}=verification(g)
 return [['Concurrent players',Math.round((raw-Object.keys(g.rolling??{}).length)*.23)],['Daily active players',raw],['Weekly active players',Math.min(g.metrics.unique+g.suspicious,Math.round(raw*1.9))],['Monthly active players',Math.min(g.metrics.unique+g.suspicious,Math.round(raw*3.1))],['Historical verified uniques',g.metrics.unique],['Average session',g.metrics.minutes.toFixed(1)+' min'],['D1 retention',Math.min(100,g.metrics.retention*1.5).toFixed(0)+'%'],['D7 retention',g.metrics.retention+'%'],['Returning players',g.returning],['Verified active players',g.metrics.active],['Suspicious accounts',g.suspicious],['Player Verification Score',score+'%']] as const
}
export function activity(g:Game,range:string){
 const r=ranges.indexOf(range)+1
 return Array.from({length:24},(_,i)=>({time:i===23?'Now':range.startsWith('5')||range.startsWith('30 min')?`−${Math.ceil((23-i)*(r===1?5:30)/23)}m`:range.includes('days')?`−${Math.ceil((23-i)*(r===5?7:30)/23)}d`:`−${Math.ceil((23-i)*(r===3?60:1440)/23)}m`,verified:Math.round(g.metrics.active*(i===23?1:.56+i*.015+Math.sin(i*1.7+r)*.11)),concurrent:Math.round((g.metrics.active-Object.keys(g.rolling??{}).length+g.suspicious)*(i===23?.23:.14+Math.sin(i+r)*.05))}))
}
