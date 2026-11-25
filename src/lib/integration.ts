import type {Session} from './model'
export interface GameplayAttestation { gameId:string; session:Session; signer:string; signature:string }
export interface GameplayAttestationProvider { verify(attestation:GameplayAttestation):Promise<boolean> }
export interface ChainAdapter {
 chainId:97|56
 account():Promise<`0x${string}`|null>
 tokenBalance(token:`0x${string}`,owner:`0x${string}`):Promise<bigint>
 graduate(token:`0x${string}`,attestations:GameplayAttestation[]):Promise<{transactionHash:`0x${string}` }>
}
