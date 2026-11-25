import type {Game} from './model'
export function rewards(g:Game){
 return ([['first100','First 100 verified players',100,g.metrics.unique>=100],['first1000','First 1,000 verified players',400,g.metrics.unique>=1000],['retention','Achieve 30% D7 retention',250,g.metrics.retention>=30],['migration','Complete token graduation',750,!!g.migrated],['healthy','Sustain healthy activity for 7 days after migration',1000,!!g.migrated&&Date.now()-Date.parse(g.migrated.date)>=604800000&&g.metrics.active>=g.targets.active&&g.metrics.retention>=g.targets.retention]] as const).map(([id,label,points,eligible])=>({id,label,points,status:g.claimed.includes(id)?'Claimed':eligible?'Unlocked':'Locked'}))
}
