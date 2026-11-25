import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const browser=await chromium.launch()
try{
 const page=await browser.newPage()
 await page.goto(process.env.ROFUN_URL||'http://127.0.0.1:4199')
 const btn=name=>page.getByRole('button',{name,exact:true})
 await btn('Play Relic Vale').click();await btn('Try a P2P trade').click()
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
 await btn('List relic').first().click()
 await page.getByText('Relic locked and listed.').waitFor()
 await btn('Buyer A').click()
 await btn('Review purchase').click()
 await btn('Request trade').click()
 await page.getByText('Buyer requested · awaiting seller approval').waitFor()
 await btn('Seller').click()
 await btn('Approve trade').click()
 await page.getByText('Seller approved · awaiting buyer confirmation').waitFor()
 await btn('Buyer A').click()
 await btn('Confirm final trade').click()
 await page.getByText('Purchase settled.').waitFor()
 const relicName=(await page.locator('.relic-market details summary').first().innerText()).split(' · ')[0]
 await btn('Portfolio').click()
 await page.locator('.portfolio-account summary').click()
 await page.getByLabel('Relic Vale account').selectOption('Mentor demo')
 await page.getByLabel('Demo trader').selectOption('Buyer A')
 await page.getByText('1 RELIC',{exact:true}).waitFor()
 await btn('In-game items').click()
 await page.getByText(relicName,{exact:true}).waitFor()
 await btn('BNB').click()
 assert.match(await page.locator('.list-row').last().innerText(),/BNB/)
 console.log('Browser passed expedition, reviewed trade, receipt, portfolio and both valuations.')

}finally{await browser.close()}
