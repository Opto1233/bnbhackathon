import type {Game,Session} from './model'
export function verification(g:Game){
 return {raw:g.metrics.active+g.suspicious,score:g.metrics.active+g.suspicious?Math.round(100*g.metrics.active/(g.metrics.active+g.suspicious)):0}
}
export function qualifies(s:Session,history:Session[]=[]){
 return (s.outcome==='Victory'||s.outcome==='Game over')&&(s.activeSeconds??0)>=30&&s.coins>=3&&s.actions>=20&&!history.some(p=>p.id===s.id)
}
export function botAttack(g:Game):Game{return {...g,suspicious:g.suspicious+500}}
