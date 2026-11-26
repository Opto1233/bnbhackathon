import { useEffect, useState } from 'react'
import {
  createWalletClient, custom, formatEther, isAddress, parseEventLogs, publicActions, zeroAddress,
  type Address, type EIP1193Provider, type Hash,
} from 'viem'
import { bscTestnet } from 'viem/chains'
import { coinAbi, marketAbi, marketBytecode, marketImmutableRanges, marketRuntime, relicAbi } from '../lib/relic-contracts'
import { Button } from './ui/button'

const explorer = 'https://testnet.bscscan.com/'
const price = 10n ** 18n
const tokenId = 1n
type Sale = { id: bigint; seller: Address; buyer: Address; paid: bigint; proceeds: bigint; fee: bigint; burned: bigint }
const sameAddress = (a: Address, b: Address) => a.toLowerCase() === b.toLowerCase()
const makeClient = (provider: EIP1193Provider) =>
  createWalletClient({ chain: bscTestnet, transport: custom(provider) }).extend(client => ({
    async assertTestnet() {
      if (await client.getChainId() !== bscTestnet.id) throw new Error('Switch your wallet to BNB Smart Chain Testnet (97).')
    },
  }))

type MarketView = Awaited<ReturnType<typeof readMarket>>
async function readMarket(provider: EIP1193Provider, address: Address, account: Address) {
  const client = makeClient(provider).extend(publicActions)
  await client.assertTestnet()
  const runtime = await client.getCode({ address })
  const normalized = runtime && marketImmutableRanges.reduce((code, { start, length }) => {
    const offset = 2 + 2 * start
    return code.slice(0, offset) + '0'.repeat(2 * length) + code.slice(offset + 2 * length)
  }, String(runtime))
  if (normalized !== marketRuntime) throw new Error('Use a RoFun market deployed from this build.')
  const market = { address, abi: marketAbi } as const
  const [coin, relic, seller, id, treasury] = await Promise.all([
    client.readContract({ ...market, functionName: 'coin' }),
    client.readContract({ ...market, functionName: 'relic' }),
    client.readContract({ ...market, functionName: 'seller' }),
    client.readContract({ ...market, functionName: 'listingId' }),
    client.readContract({ ...market, functionName: 'treasury' }),
  ])
  const payment = { address: coin, abi: coinAbi } as const
  const item = { address: relic, abi: relicAbi } as const
  const [owner, balance, allowance, claimed, approved, treasuryBalance, supply] = await Promise.all([
    client.readContract({ ...item, functionName: 'ownerOf', args: [tokenId] }),
    client.readContract({ ...payment, functionName: 'balanceOf', args: [account] }),
    client.readContract({ ...payment, functionName: 'allowance', args: [account, address] }),
    client.readContract({ ...payment, functionName: 'claimed', args: [account] }),
    client.readContract({ ...item, functionName: 'getApproved', args: [tokenId] }),
    client.readContract({ ...payment, functionName: 'balanceOf', args: [treasury] }),
    client.readContract({ ...payment, functionName: 'totalSupply' }),
  ])
  return { coin, relic, seller, id, treasury, owner, balance, allowance, claimed, approved, treasuryBalance, supply }
}

export default function TestnetMarket() {
  const [address, setAddress] = useState(() => new URLSearchParams(location.hash.split('?')[1]).get('market') ?? '')
  const [treasury, setTreasury] = useState('')
  const [account, setAccount] = useState<Address>()
  const [market, setMarket] = useState<MarketView>()
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const [hash, setHash] = useState<Hash>()
  const [sale, setSale] = useState<Sale>()
  const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum

  useEffect(() => {
    const reset = () => { setAccount(undefined); setMarket(undefined); setSale(undefined); setHash(undefined) }
    provider?.on?.('accountsChanged', reset)
    provider?.on?.('chainChanged', reset)
    return () => {
      provider?.removeListener?.('accountsChanged', reset)
      provider?.removeListener?.('chainChanged', reset)
    }
  }, [provider])

  async function run(task: (client: ReturnType<typeof makeClient>, wallet: Address, source: EIP1193Provider) => Promise<void>) {
    if (!provider) { setStatus('Open RoFun in a browser with a Web3 wallet.'); return }
    setPending(true)
    setStatus('')
    try {
      const client = makeClient(provider)
      await client.assertTestnet()
      const [wallet] = await client.requestAddresses()
      if (!wallet) throw new Error('Connect a wallet account.')
      setAccount(wallet)
      await task(client, wallet, provider)
    } catch (error) {
      setStatus(error instanceof Error ? ('shortMessage' in error ? String(error.shortMessage) : error.message) : 'Wallet request failed.')
    } finally {
      setPending(false)
    }
  }

  async function switchToTestnet() {
    if (!provider) { setStatus('Open RoFun in a browser with a Web3 wallet.'); return }
    setPending(true)
    try {
      const client = makeClient(provider)
      try { await client.switchChain({ id: bscTestnet.id }) }
      catch (error) {
        if ((error as { code?: number }).code !== 4902) throw error
        await client.addChain({ chain: bscTestnet })
        await client.switchChain({ id: bscTestnet.id })
      }
      setStatus('BSC Testnet selected.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Switch to BSC Testnet in your wallet.')
    } finally { setPending(false) }
  }

  async function execute(action: 'deploy' | 'claim' | 'approveItem' | 'list' | 'approveCoin' | 'buy' | 'cancel') {
    await run(async (wallet, account, source) => {
      const client = wallet.extend(publicActions)
      let tx: Hash
      let target: Address
      setSale(undefined)
      setHash(undefined)
      if (action === 'deploy') {
        if (!isAddress(treasury) || sameAddress(treasury, account) || sameAddress(treasury, zeroAddress)) {
          throw new Error('Enter a separate RoFun treasury wallet.')
        }
        tx = await client.deployContract({ abi: marketAbi, bytecode: marketBytecode, args: [treasury], account })
      } else {
        if (!isAddress(address) || !market) throw new Error('Load a market contract first.')
        const calls = {
          claim: () => client.writeContract({ address: market.coin, abi: coinAbi, functionName: 'claim', account }),
          approveItem: () => client.writeContract({ address: market.relic, abi: relicAbi, functionName: 'approve', args: [address, tokenId], account }),
          list: () => client.writeContract({ address, abi: marketAbi, functionName: 'list', account }),
          approveCoin: () => client.writeContract({ address: market.coin, abi: coinAbi, functionName: 'approve', args: [address, price], account }),
          buy: () => client.writeContract({ address, abi: marketAbi, functionName: 'buy', args: [market.id], account }),
          cancel: () => client.writeContract({ address, abi: marketAbi, functionName: 'cancel', args: [market.id], account }),
        }
        tx = await calls[action]()
      }
      setHash(tx)
      setStatus('Waiting for BSC Testnet confirmation…')
      const receipt = await client.waitForTransactionReceipt({ hash: tx })
      if (receipt.status !== 'success') throw new Error('Transaction reverted. Check the transaction in the explorer.')
      if (action === 'deploy') {
        if (!receipt.contractAddress) throw new Error('Deployment returned no market address.')
        target = receipt.contractAddress
        setAddress(target)
      } else {
        target = address as Address
      }
      if (action === 'buy') {
        const [event] = parseEventLogs({ abi: marketAbi, eventName: 'Settled', logs: receipt.logs.filter(log => sameAddress(log.address, target)) })
        if (!event) throw new Error('The confirmed transaction is missing the market settlement event.')
        setSale(event.args)
      }
      setMarket(await readMarket(source, target, account))
      setStatus('Confirmed on BSC Testnet.')
    })
  }

  const listed = market && !sameAddress(market.seller, zeroAddress)
  const canList = market && account && !listed && sameAddress(market.owner, account)
  const isSeller = market && account && sameAddress(market.seller, account)

  return <section className="panel trade-stage">
    <h1>Relic Vale · BSC Testnet</h1>
    <p>Trade the sample Vault Relic NFT for 1 test RELIC. Use separate seller and buyer wallets with tBNB for gas.</p>
    <label className="field">Market contract address<input value={address} onChange={event => { setAddress(event.target.value); setMarket(undefined); setSale(undefined); setHash(undefined) }} disabled={pending} placeholder="0x…" /></label>
    <div className="hero-actions">
      <Button disabled={pending} onClick={switchToTestnet}>Switch wallet to BSC Testnet</Button>
      <Button disabled={pending || !isAddress(address)} onClick={() => run(async (_, wallet, source) => setMarket(await readMarket(source, address as Address, wallet)))}>Load or refresh market</Button>
      {isAddress(address) && <a href={'#Testnet%20Market?market=' + address}>Market share link</a>}
    </div>
    <details className="panel">
      <summary>Seller setup · deploy a new test market</summary>
      <label className="field">RoFun treasury address<input value={treasury} onChange={event => setTreasury(event.target.value)} placeholder="0x…" disabled={pending} /></label>
      <Button disabled={pending || !isAddress(treasury)} onClick={() => execute('deploy')}>Deploy market and sample NFT</Button>
    </details>
    {account && <p>Active wallet · {account}</p>}
    {market && <>
      <p>Vault Relic #1 owner · <a href={explorer + 'address/' + market.owner}>{market.owner}</a></p>
      <p>{listed ? 'Listed and held by the market · ' + formatEther(price) + ' RELIC' : 'No active listing'}</p>
      <p>Your RELIC · {formatEther(market.balance)} · Treasury RELIC · {formatEther(market.treasuryBalance)} · Total supply · {formatEther(market.supply)}</p>
      <div className="hero-actions">
        {canList && (sameAddress(market.approved, address as Address)
          ? <Button disabled={pending} onClick={() => execute('list')}>List NFT for 1 RELIC</Button>
          : <Button disabled={pending} onClick={() => execute('approveItem')}>Approve NFT for listing</Button>)}
        {isSeller && <Button disabled={pending} onClick={() => execute('cancel')}>Cancel listing</Button>}
        {!market.claimed && <Button disabled={pending} onClick={() => execute('claim')}>Claim 2 test RELIC</Button>}
        {listed && !isSeller && market.balance >= price && (market.allowance < price
          ? <Button disabled={pending} onClick={() => execute('approveCoin')}>Approve 1 RELIC</Button>
          : <Button variant="primary" disabled={pending} onClick={() => execute('buy')}>Buy Vault Relic for 1 RELIC</Button>)}
      </div>
      <p>Seller receives 0.99 RELIC · RoFun receives 0.005 RELIC · 0.005 RELIC burned. Wallet gas is paid separately in tBNB.</p>
      <p><a href={explorer + 'address/' + address}>Market</a> · <a href={explorer + 'token/' + market.coin}>RELIC token</a> · <a href={explorer + 'token/' + market.relic}>Vault Relic NFT</a></p>
    </>}
    <p role="status">{status}</p>
    {hash && <p><a href={explorer + 'tx/' + hash}>View transaction on BscScan</a></p>}
    {sale && <div className="success">
      <div><strong>Listing #{String(sale.id)} settled</strong><p>Buyer {sale.buyer} paid {formatEther(sale.paid)} RELIC and received the NFT.</p><p>Seller {sale.seller} received {formatEther(sale.proceeds)} RELIC · Treasury received {formatEther(sale.fee)} · Burned {formatEther(sale.burned)}.</p></div>
    </div>}
  </section>
}
