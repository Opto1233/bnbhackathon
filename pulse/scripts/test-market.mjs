import assert from 'node:assert/strict';
import fs from 'node:fs';
import ganache from 'ganache';
import {BrowserProvider,ContractFactory} from 'ethers';
const rpc=ganache.provider({chain:{chainId:97},logging:{quiet:true}});
try {
  const provider=new BrowserProvider(rpc), alice=await provider.getSigner(),bob=await provider.getSigner(1);
  const {abi,bytecode,runtime}=JSON.parse(fs.readFileSync('src/market.json'));
  const c=await new ContractFactory(abi,bytecode,alice).deploy();await c.waitForDeployment();
  assert.equal(await provider.getCode(c.target),runtime);
  const price=await c.quote(1,10,true);
  await(await c.buy(1,10,{value:price})).wait();
  assert.equal(await c.balanceOf(alice.address,1),10n);
  assert.ok(await c.quote(1,10,true)>price);
  assert.equal(await c.quote(2,10,true),price);
  await assert.rejects(c.connect(bob).sell(1,10,price));
  await(await c.sell(1,10,price)).wait();
  assert.equal(await c.supply(1),0n);
  await(await c.connect(bob).launch()).wait();
  assert.equal(await c.listed(BigInt(bob.address)),true);
  console.log('Verified exact runtime, independent markets, purchase, sale, ownership and creator launch.');
} finally {await rpc.disconnect();}
