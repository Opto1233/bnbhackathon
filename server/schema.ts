import {sql} from 'drizzle-orm'
import {sqliteTable,integer,text,index,uniqueIndex} from 'drizzle-orm/sqlite-core'
export const items=sqliteTable('relic_items',{
 id:text().primaryKey(),room:text().notNull(),mintedTo:text().notNull(),name:text().notNull(),
},t=>[index('relic_room_items').on(t.room,t.mintedTo)])
export const listings=sqliteTable('relic_listings',{
 id:text().primaryKey(),room:text().notNull(),item:text().notNull().references(()=>items.id),
 seller:text().notNull(),price:integer().notNull(),status:text().notNull().default('open'),buyer:text(),soldAt:integer(),
},t=>[uniqueIndex('one_open_relic').on(t.item).where(sql`status = 'open'`),index('relic_history').on(t.item,t.status),index('relic_buyer').on(t.room,t.buyer),index('relic_seller').on(t.room,t.seller)])
export const runs=sqliteTable('relic_runs',{
 id:text().primaryKey(),room:text().notNull(),player:text().notNull(),revision:integer().notNull(),data:text().notNull(),
},t=>[uniqueIndex('current_expedition').on(t.room,t.player)])
