import {defineConfig} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import {localMarket} from './server/local.mjs'
export default defineConfig({plugins:[tailwindcss(),{name:'local-relic-market',configureServer(server){server.middlewares.use(localMarket())}}]})
