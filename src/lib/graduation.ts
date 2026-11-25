import type {Game,Metrics} from './model'
export const defaults:Metrics={active:100,unique:1000,minutes:15,retention:30,liquidity:10}
export const rules=[
 ['active','Verified active players','','Distinct verified accounts with meaningful play in a rolling 24-hour window.'],
 ['unique','Historical unique players','','Distinct verified accounts across the lifetime of the game.'],
 ['minutes','Average meaningful playtime',' min','Average duration of verified gameplay sessions.'],
 ['retention','Day-7 retention','%','Share of a mature player cohort that returns on day seven.'],
 ['liquidity','Liquidity reserve',' BNB','Simulated BNB available for the destination pool.'],
] as const
export function graduation(g:Game){
 const rows=rules.map(([key,label,unit,help])=>({key,label,unit,help,value:g.metrics[key],target:g.targets[key],pass:g.metrics[key]>=g.targets[key],progress:Math.min(100,g.metrics[key]/g.targets[key]*100)}))
 const passed=rows.filter(r=>r.pass).length
 return {rows,passed,eligible:passed===rows.length&&!g.migrated,progress:g.migrated?100:Math.floor(rows.reduce((sum,r)=>sum+r.progress,0)/rows.length),status:g.migrated?'Migrated':passed===rows.length?(g.ready?'Ready to Graduate':'Requirements Met'):'Pre-Migration'}
}
