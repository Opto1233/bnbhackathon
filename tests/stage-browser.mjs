import assert from 'node:assert/strict'
import {chromium} from 'playwright'

const browser=await chromium.launch()
const base=process.env.ROFUN_URL||'http://127.0.0.1:4199'
try{
 for(const width of [1280,390]){
  const recording=width===1280&&process.env.ROFUN_VIDEO
  const context=await browser.newContext({viewport:{width,height:820},...(recording?{recordVideo:{dir:recording,size:{width,height:820}}}:{})})
  const page=await context.newPage()
  page.setDefaultTimeout(12000)
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  const btn=(name)=>page.getByRole('button',{name,exact:true})
  const pause=async()=>{if(recording)await page.waitForTimeout(1200)}
  await page.goto(base)
  const started=Date.now()
  await btn('Start demo').click()
  await pause()
  let relicName='Amber Scarab'
  if(width===1280){
   await btn('Play the vault').click()
   const tiles=page.locator('.relic-tile')
   await tiles.first().waitFor()
   const known=new Map()
   for(let turn=0;turn<7;turn++){
    const free=[]
    await page.waitForFunction(()=>!document.querySelector('.trade-stage .hero-actions button:last-child')?.disabled)
    for(let i=0;i<6;i++)if(!await tiles.nth(i).isDisabled())free.push(i)
    if(!free.length)break
    const pair=free.find(i=>known.has(i)&&free.some(j=>j!==i&&known.get(j)===known.get(i)))
    const first=pair??free.find(i=>!known.has(i))??free[0]
    async function reveal(i){
     const response=page.waitForResponse(r=>r.url().includes('/api/relic')&&r.request().method()==='POST')
     await tiles.nth(i).click()
     const snapshot=await (await response).json()
     known.set(i,snapshot.run.cards[i])
     await page.waitForFunction(()=>!document.querySelector('.trade-stage .hero-actions button:last-child')?.disabled)
     if(recording)await page.waitForTimeout(300)
    }
    await reveal(first)
    await reveal(free.find(j=>j!==first&&known.get(j)===known.get(first))??free.find(j=>j!==first&&!known.has(j))??free.find(j=>j!==first))
   }
   await btn('List recovered relic for 1 RELIC').waitFor()
   relicName=(await page.locator('.trade-stage .success').innerText()).replace('Recovered ','').trim()
   await pause()
   await btn('List recovered relic for 1 RELIC').click()
  }else await btn('Use sample listing · 1 RELIC').click()
  await btn('Request as both buyers').waitFor()
  await pause()
  await btn('Request as both buyers').click()
  await btn('Approve as seller').waitFor()
  await pause()
  await btn('Approve as seller').click()
  await page.getByRole('button',{name:/Review for/}).waitFor()
  assert(await page.getByRole('button',{name:/Review for/}).isDisabled())
  const outcomes=[]
  page.on('response',r=>{if(r.request().method()==='POST'&&r.request().postDataJSON()?.action==='buy')outcomes.push(r.status())})
  await btn('Confirm both purchases').click()
  const receipt=page.locator('.stage-receipt')
  await receipt.waitFor()
  assert.deepEqual(outcomes.sort(),[200,409])
  assert.match(await receipt.innerText(),/2 RELIC → 2.99 RELIC/)
  assert.match(await receipt.innerText(),/2 RELIC → 1 RELIC/)
  assert.match(await receipt.innerText(),/2 RELIC → 2 RELIC/)
  const owner=(await receipt.innerText()).match(/Current owner · (Buyer [AB])/)[1]
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow')
  await pause()
  await btn('View item in Portfolio').click()
  await page.locator('.list-row.success').getByText(relicName).waitFor()
  assert.match(decodeURIComponent(page.url()),new RegExp('Portfolio/stage-'+owner+'/'))
  await btn('BNB').click()
  assert.match(await page.locator('.list-row.success').innerText(),/Last sale[\s\S]*BNB/)
  console.log(width+'px Discover to winning portfolio in '+((Date.now()-started)/1000).toFixed(1)+'s')
  await pause()
  await page.reload()
  await page.locator('.list-row.success').getByText(relicName).waitFor()
  assert.deepEqual(errors,[])
  await btn('Coins').click()
  await page.locator('.portfolio-sources').getByText(/market wallet 1/).waitFor()
  await page.locator('.portfolio-history').getByText('Sample chart · illustrative prices').waitFor()
  const video=page.video()
  await context.close()
  if(recording&&video)console.log('Recording: '+await video.path())
 }
}finally{await browser.close()}
