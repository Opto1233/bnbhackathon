import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const browser=await chromium.launch()
try{
 const page=await browser.newPage()
 await page.goto(process.env.ROFUN_URL||'http://127.0.0.1:4199')
 const btn=name=>page.getByRole('button',{name,exact:true})
 await btn('Play Relic Vale').click();await btn('Mentor demo').click()
 await btn('Enter the vault').click()
 const tiles=page.locator('.relic-tile')
 const known=new Map()
 for(let turn=0;turn<7&&!(await btn('Play again').count());turn++){
  const free=[]
  for(let i=0;i<6;i++)if(!(await tiles.nth(i).isDisabled()))free.push(i)
  const pair=free.find(i=>known.has(i)&&free.some(j=>j!==i&&known.get(j)===known.get(i)))
  const first=pair??free.find(i=>!known.has(i))??free[0]
  async function flip(i){const response=page.waitForResponse(r=>r.url().includes('/api/relic')&&r.request().method()==='POST');await tiles.nth(i).click();const body=await (await response).json();known.set(i,body.run.cards[i]);await page.waitForFunction(()=>!document.querySelector('.relic-tile:not(.found)')?.disabled||document.body.innerText.includes('Play again'))}
  await flip(first)
  await flip(free.find(j=>j!==first&&known.get(j)===known.get(first))??free.find(j=>j!==first&&!known.has(j))??free.find(j=>j!==first))
 }
 await page.getByText(/Vault recovered/).waitFor()
 await btn('List relic').first().click();await btn('Test two buyers').click();await btn('Run simultaneous purchases').click()
 await page.getByText(/No funds taken/).waitFor()
 assert.match(await page.locator('.relic-market').innerText(),/2.99 RELIC/)
 await page.getByLabel('Demo trader').selectOption('Buyer A');await btn('Refresh market').waitFor()
 console.log('Browser passed expedition, reward, listing, concurrent purchases and receipt.')
}finally{await browser.close()}
