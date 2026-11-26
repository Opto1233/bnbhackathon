import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createInterface } from 'node:readline'
import { createWalletClient, http, parseEther, parseEventLogs, publicActions, zeroAddress } from 'viem'
import { bscTestnet } from 'viem/chains'
import { coinAbi, marketAbi, marketBytecode, relicAbi } from '../src/lib/relic-contracts.ts'

const node = spawn('anvil', ['--chain-id', '97', '--host', '127.0.0.1', '--port', '0'], { stdio: ['ignore', 'pipe', 'inherit'] })
const exit = once(node, 'exit')
try {
  const urls = createInterface({ input: node.stdout })
  let url
  for await (const line of urls) {
    const bound = line.match(/Listening on (127\.0\.0\.1:\d+)/)
    if (bound) { url = 'http://' + bound[1]; break }
  }
  assert.ok(url, 'Anvil started')
  const client = createWalletClient({ chain: bscTestnet, transport: http(url) }).extend(publicActions)
  const [seller, buyerA, buyerB, treasury] = (await client.getAddresses()).map(address => ({ address }))
  const wait = async hash => client.waitForTransactionReceipt({ hash: await hash, pollingInterval: 20 })
  const success = async hash => {
    const receipt = await wait(hash)
    assert.equal(receipt.status, 'success')
    return receipt
  }
  const deploy = await success(client.deployContract({ account: seller.address, abi: marketAbi, bytecode: marketBytecode, args: [treasury.address] }))
  const address = deploy.contractAddress
  const market = { address, abi: marketAbi }
  const coin = { address: await client.readContract({ ...market, functionName: 'coin' }), abi: coinAbi }
  const relic = { address: await client.readContract({ ...market, functionName: 'relic' }), abi: relicAbi }
  const balance = account => client.readContract({ ...coin, functionName: 'balanceOf', args: [account.address] })
  const owner = () => client.readContract({ ...relic, functionName: 'ownerOf', args: [1n] })
  await success(client.writeContract({ ...relic, account: seller.address, functionName: 'approve', args: [address, 1n] }))
  await success(client.writeContract({ ...market, account: seller.address, functionName: 'list' }))
  await success(client.writeContract({ ...market, account: seller.address, functionName: 'cancel', args: [1n] }))
  assert.equal(await owner(), seller.address)
  await success(client.writeContract({ ...relic, account: seller.address, functionName: 'approve', args: [address, 1n] }))
  await success(client.writeContract({ ...market, account: seller.address, functionName: 'list' }))
  assert.equal((await owner()).toLowerCase(), address.toLowerCase())
  const buyers = [buyerA, buyerB]
  for (const account of buyers) {
    await success(client.writeContract({ ...coin, account: account.address, functionName: 'claim' }))
    await success(client.writeContract({ ...coin, account: account.address, functionName: 'approve', args: [address, parseEther('1')] }))
  }
  const buy = (account, id) => client.writeContract({ ...market, account: account.address, functionName: 'buy', args: [id], gas: 250000n })
  assert.equal((await wait(buy(buyerA, 1n))).status, 'reverted')
  assert.equal(await balance(buyerA), parseEther('2'))
  const results = await Promise.all(buyers.map(account => wait(buy(account, 2n))))
  assert.deepEqual(results.map(receipt => receipt.status).sort(), ['reverted', 'success'])
  const winnerIndex = results.findIndex(receipt => receipt.status === 'success')
  const winner = buyers[winnerIndex]
  const [event] = parseEventLogs({ abi: marketAbi, eventName: 'Settled', logs: results[winnerIndex].logs })
  assert.equal(event.args.buyer, winner.address)
  assert.equal(event.args.burned, parseEther('0.005'))
  assert.equal(await owner(), winner.address)
  assert.equal(await balance(winner), parseEther('1'))
  assert.equal(await balance(buyers[1 - winnerIndex]), parseEther('2'))
  assert.equal(await balance(seller), parseEther('0.99'))
  assert.equal(await balance(treasury), parseEther('0.005'))
  assert.equal(await client.readContract({ ...coin, functionName: 'totalSupply' }), parseEther('3.995'))
  assert.equal(await client.readContract({ ...market, functionName: 'seller' }), zeroAddress)
  console.log('Local EVM: NFT transfer, cancelled quote rejection, one successful purchase, fee split and actual supply reduction verified.')
} finally {
  node.kill()
  await exit
}
