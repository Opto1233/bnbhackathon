import {
  AbiCoder, BrowserProvider, Contract, ZeroAddress, ZeroHash, formatEther, getAddress, getBytes,
  keccak256, parseEther, parseUnits, randomBytes, solidityPacked
} from 'ethers';

const chainId = 97n;
const presetId = 1778027615722n; // Bonding V1 on the documented developer fork.
const sourceRegistry = '0xe5014c0616e528b0abf7cc120a58032c1fbe7060';
const registryAbi = ['function openFourCore() view returns(address)', 'function openFourTool() view returns(address)'];
const coreAbi = [
  'function signer() view returns(address)',
  'function wrappedNative() view returns(address)',
  'function createToken(bytes,bytes) payable returns(address)',
  'function buyByBudget(address,uint256,uint256,uint256,bytes) payable',
  'function sell(address,uint256,uint256,uint256,bytes)',
  'function tokens(address) view returns(uint32 version,address creator,uint256 presetId,address token,string name,string symbol,uint256 maxSupply,uint256 saleAmount,uint256 raiseAmount,address quoteAsset,address vault,address curveModule,address tradeModule,address migrateModule,address tokenModule,address customData,uint256 createBlock,bool exists,bool paused,bool antiSniperEnabled)',
  'event TokenCreated(uint256 requestId,uint256 indexed presetId,address indexed creator,address indexed token,string name,string symbol,uint256 maxSupply,uint256 saleAmount,uint256 raiseAmount,uint256 initialPrice,address quoteAsset,address vault,address curveModule,address tradeModule,address migrateModule,address customData,address tokenModule,string tokenMetaUri,uint256 flags,bytes encodedTags)'
];
const params = 'tuple(string name,string abiType,uint8 decimals,bool optional,string title,string defaultValue,string hint,string minValue,string maxValue)';
const schema = 'tuple(string kind,uint8 version,' + params + '[] params)';
const estimate = ' returns(tuple(uint256 curveQuote,uint256 totalFee,uint256 userPays,uint256 userReceives,uint256 tokenAmount,uint256 executionPrice))';
const toolsAbi = [
  'function getPresetEncodeSchemas(uint256) view returns(' + Array(6).fill(schema).join(',') + ')',
  'function estimateBuyByBudget(address,address,uint256,uint256,bytes)' + estimate,
  'function estimateSell(address,address,uint256,uint256,bytes)' + estimate
];
const erc20Abi = [
  'function balanceOf(address) view returns(uint256)',
  'function allowance(address,address) view returns(uint256)',
  'function approve(address,uint256) returns(bool)'
];
const coder = AbiCoder.defaultAbiCoder();
const createType = 'tuple(uint256 requestId,uint256 presetId,uint256 validTimestamp,uint256 createFee,uint256 presaleQuote,bool antiSniperEnabled,address partner,tuple(string name,string symbol,string tokenUri,uint256 maxSupply,uint256 saleAmount,uint256 raiseAmount,address quoteAsset,bytes32 tokenSalt,bytes tokenParams,bytes vaultParams,bytes curveParams,bytes tradeParams,bytes migrateParams,bytes customDataParams) initParams)';

function moduleParams(module, form) {
  if (!module.params.length) return '0x';
  const values = module.params.map(param => {
    const raw = form[param.name] ?? param.defaultValue;
    if (raw === '' && !param.optional) throw Error('Preset requires a value for ' + param.name + '.');
    if (param.abiType === 'bool') return raw === 'true' || raw === '1';
    if (param.abiType === 'address') return raw || ZeroAddress;
    if (param.abiType === 'bytes32') return raw || ZeroHash;
    if (param.abiType === 'bytes') return raw || '0x';
    if (param.abiType === 'string') return raw;
    if (/^u?int\d*$/.test(param.abiType)) return parseUnits(raw || '0', Number(param.decimals));
    throw Error('Unsupported Bonding V1 parameter: ' + param.name + '.');
  });
  return coder.encode(['(' + module.params.map(param => param.abiType).join(',') + ')'], [values]);
}

export function encodeMomentLaunch(name, symbol, quoteAsset, schemas, requestId, deadline) {
  // The standard Bonding V1 test configuration published by OpenFour.
  const form = {name, symbol, maxSupply:'10000000000', saleAmount:'8000000000', raiseAmount:'0.3'};
  return coder.encode([createType], [[requestId, presetId, deadline, 0n, 0n, false, ZeroAddress, [
    name, symbol, '', parseEther(form.maxSupply), parseEther(form.saleAmount), parseEther(form.raiseAmount),
    quoteAsset, ZeroHash, ...schemas.map(module => moduleParams(module, form))
  ]]]);
}

export function launchDigest(account, args) {
  return getBytes(keccak256(solidityPacked(
    ['string','uint256','address','bytes32'],
    ['createOpenFourToken', chainId, account, keccak256(args)]
  )));
}

export function openFour(getWallet) {
  const configured = window.PULSE_CONFIG?.openFourRegistry;
  const registryAddress = configured ? getAddress(configured) : null;
  async function connect() {
    if (!registryAddress || registryAddress.toLowerCase() === sourceRegistry) {
      throw Error('Configure a developer-owned OpenFour Testnet Registry.');
    }
    const wallet = getWallet();
    if (!wallet) throw Error('Open a Web3 wallet to use OpenFour.');
    if (BigInt(await wallet.request({method:'eth_chainId'})) !== chainId) {
      throw Error('Switch your wallet to BNB Smart Chain Testnet (chain 97).');
    }
    await wallet.request({method:'eth_requestAccounts'});
    const provider = new BrowserProvider(wallet);
    const signer = await provider.getSigner();
    const registry = new Contract(registryAddress, registryAbi, provider);
    const [coreAddress, toolsAddress] = await Promise.all([registry.openFourCore(), registry.openFourTool()]);
    const core = new Contract(coreAddress, coreAbi, signer);
    const tools = new Contract(toolsAddress, toolsAbi, provider);
    return {provider, signer, core, tools};
  }

  async function launch({name, symbol}, submitted) {
    if (!/^[A-Z0-9]{2,8}$/.test(symbol)) throw Error('Use a 2–8 character ticker (A–Z or 0–9).');
    const {provider, signer, core, tools} = await connect();
    const [account, authorizer, quote, schemas, block] = await Promise.all([
      signer.getAddress(), core.signer(), core.wrappedNative(), tools.getPresetEncodeSchemas(presetId), provider.getBlock('latest')
    ]);
    if (account.toLowerCase() !== authorizer.toLowerCase()) {
      throw Error('This test launch requires the wallet configured as the fork’s Core signer.');
    }
    const requestId = BigInt('0x' + Array.from(randomBytes(16), byte => byte.toString(16).padStart(2,'0')).join(''));
    if (!block) throw Error('Could not read the Testnet clock.');
    const args = encodeMomentLaunch(name, symbol, quote, schemas, requestId, BigInt(block.timestamp + 900));
    const signature = await signer.signMessage(launchDigest(account, args));
    await core.createToken.staticCall(args, signature);
    const tx = await core.createToken(args, signature);
    const pending = {registry:registryAddress, core:core.target, hash:tx.hash, requestId:String(requestId), account};
    submitted(pending);
    let receipt;
    try { receipt = await tx.wait(); }
    catch (error) {
      if (error.receipt?.status === 0) error.definitiveRevert = true;
      if (error.code === 'TRANSACTION_REPLACED' && error.reason === 'repriced' && error.receipt?.status === 1) {
        receipt = error.receipt;
      } else {
        if (error.code === 'TRANSACTION_REPLACED' && error.cancelled) error.definitiveRevert = true;
        throw error;
      }
    }
    return confirmLaunch(core, pending, receipt);
  }

  function confirmLaunch(core, pending, receipt) {
    if (!receipt) throw Error('Launch is still pending. Check again after confirmation.');
    if (receipt.status !== 1) throw Object.assign(Error('The OpenFour launch reverted.'), {definitiveRevert:true});
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== pending.core.toLowerCase()) continue;
      const event = core.interface.parseLog(log);
      if (event?.name === 'TokenCreated' && event.args.presetId === presetId &&
          String(event.args.requestId) === pending.requestId && event.args.creator.toLowerCase() === pending.account.toLowerCase()) {
        return {token:event.args.token, registry:registryAddress, hash:receipt.hash, preset:String(presetId)};
      }
    }
    throw Error('OpenFour launch receipt does not contain the expected TokenCreated event.');
  }
  async function recover(pending) {
    const {provider, core} = await connect();
    if (pending.registry !== registryAddress || pending.core !== core.target) throw Error('Switch back to the launch Registry.');
    return confirmLaunch(core, pending, await provider.getTransactionReceipt(pending.hash));
  }

  async function preview(coin, side, input) {
    const {core, tools, signer} = await connect();
    if (coin.registry !== registryAddress) throw Error('This coin belongs to a different Testnet Registry.');
    const contract = new Contract(coin.token, erc20Abi, signer);
    const account = await signer.getAddress();
    const [runtime, wrapped] = await Promise.all([core.tokens(coin.token), core.wrappedNative()]);
    if (!runtime.exists || runtime.paused || runtime.presetId !== presetId || runtime.quoteAsset !== wrapped) throw Error('This OpenFour market is unavailable.');
    const vault = new Contract(runtime.vault, ['function phase() view returns(uint8)'], signer);
    if (await vault.phase() !== 1n) throw Error('This market is outside the OpenFour bonding phase.');
    const buy = side === 'buy';
    const percent = Number(input);
    if (!buy && (!Number.isInteger(percent) || percent < 1 || percent > 100)) throw Error('Enter a whole percentage from 1 to 100.');
    const amount = buy ? parseEther(input) : await contract.balanceOf(account) * BigInt(percent) / 100n;
    if (amount <= 0n) throw Error(buy ? 'Enter a positive tBNB budget.' : 'You do not hold any coins to sell.');
    const estimator = buy ? tools.estimateBuyByBudget : tools.estimateSell;
    const quote = await estimator.staticCall(coin.token, account, amount, 0n, '0x');
    if (!quote.tokenAmount || (!buy && (quote.tokenAmount !== amount || !quote.userReceives))) throw Error('OpenFour cannot fill this order.');
    return {
      quantity:formatEther(quote.tokenAmount), total:formatEther(buy ? quote.userPays : quote.userReceives),
      fee:formatEther(quote.totalFee),
      async confirm(submitted) {
        const sameWallet = async () => {
          const wallet = getWallet();
          if (!wallet || BigInt(await wallet.request({method:'eth_chainId'})) !== chainId ||
              (await wallet.request({method:'eth_accounts'}))[0]?.toLowerCase() !== account.toLowerCase()) {
            throw Error('Wallet or network changed. Preview again.');
          }
        };
        await sameWallet();
        if (!buy && await contract.allowance(account, core.target) < amount) {
          const approval = await (await contract.approve(core.target, amount)).wait();
          if (approval?.status !== 1) throw Error('Token approval failed.');
          await sameWallet();
        }
        const tx = buy
          ? await core.buyByBudget(coin.token, amount, quote.tokenAmount, 0n, '0x', {value:amount})
          : await core.sell(coin.token, amount, quote.userReceives, 0n, '0x');
        submitted(tx.hash);
        const receipt = await tx.wait();
        if (receipt?.status !== 1) throw Error('The trade reverted.');
        return receipt.hash;
      }
    };
  }
  return {enabled:Boolean(registryAddress && registryAddress.toLowerCase() !== sourceRegistry), launch, recover, preview};
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const providers = new Set();
  window.addEventListener('eip6963:announceProvider', event => providers.add(event.detail.provider));
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  window.pulseOpenFour = openFour(() => window.ethereum || (providers.size === 1 ? providers.values().next().value : null));
}
