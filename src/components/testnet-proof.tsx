import {useState} from 'react'
import {Button} from './ui/button'
type Provider={request:(input:{method:string;params?:unknown[]})=>Promise<unknown>}
export function TestnetProof({receipt}:{receipt:string}){
 const storageKey='rofun.testnet.receipt.'+receipt
 const validHash=(value:unknown):value is string=>typeof value==='string'&&/^0x[0-9a-f]{64}$/i.test(value)
 const [hash,setHash]=useState(()=>{try{const saved=localStorage.getItem(storageKey);return validHash(saved)?saved:''}catch{return ''}}),[status,setStatus]=useState(''),[busy,setBusy]=useState(false)
 async function record(){
  const wallet=(window as Window & {ethereum?:Provider}).ethereum
  if(!wallet){setStatus('Open this page in a browser with a testnet wallet.');return}
  setBusy(true)
  try{
   await wallet.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x61'}]})
   const [account]=await wallet.request({method:'eth_requestAccounts'}) as string[]
   if(await wallet.request({method:'eth_chainId'})!=='0x61')throw Error('Select BNB Smart Chain Testnet (97).')
   const data='0x'+[...new TextEncoder().encode('RoFun:RelicVale:'+receipt)].map(n=>n.toString(16).padStart(2,'0')).join('')
   const tx=await wallet.request({method:'eth_sendTransaction',params:[{chainId:'0x61',from:account,to:account,value:'0x0',data}]})
   if(!validHash(tx))throw Error('Wallet returned an invalid transaction hash.')
   try{localStorage.setItem(storageKey,tx)}catch{/* Keep the explorer link available in this tab. */}
   setHash(tx);setStatus('Submitted. Check confirmation and the network fee in the explorer.')
  }catch(e){setStatus((e as Error).message)}finally{setBusy(false)}
 }
 return <details className="panel"><summary>BNB Smart Chain Testnet · optional receipt reference</summary><p>Write the simulated sale’s receipt ID in a zero-value transaction to your own address. Your wallet shows the test BNB gas estimate before approval. Item custody and RELIC settlement stay in the demo ledger.</p><Button disabled={busy||!!hash} onClick={record}>Record receipt ID on testnet</Button> <span role="status">{status}</span>{hash&&<p><a href={'https://testnet.bscscan.com/tx/'+hash} target="_blank" rel="noreferrer">View testnet transaction ↗</a></p>}</details>
}
