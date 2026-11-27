import {
  AbiCoder, BrowserProvider, Contract, ZeroAddress, ZeroHash, formatEther, getAddress, getBytes, id,
  keccak256, parseEther, parseUnits, randomBytes, solidityPacked
} from 'ethers';

const chainId = 97n;
const presetId = 1778027615722n; // Bonding V1 on the documented developer fork.
const sourceRegistry = '0xe5014c0616e528b0abf7cc120a58032c1fbe7060';
const registryAbi = [
  'function openFourCore() view returns(address)',
  'function openFourTool() view returns(address)',
  'function isPresetActive(uint256) view returns(bool)'
];
const pancakeV2Router = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
const pancakeV2Migration = id('module.migrate.pcs_v2').slice(0,18);
const vaultAbi = [
  'function phase() view returns(uint8)',
  'function totalRaised() view returns(uint256)',
  'function remainingForSale() view returns(uint256)'
];
const pancakeRouterAbi = [
  'function factory() view returns(address)',
  'function WETH() view returns(address)',
  'function getAmountsOut(uint256,address[]) view returns(uint256[])',
  'function swapExactETHForTokens(uint256,address[],address,uint256) payable returns(uint256[])',
  'function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns(uint256[])'
];
const pairAbi = [
  'function factory() view returns(address)',
  'function token0() view returns(address)',
  'function token1() view returns(address)',
  'function getReserves() view returns(uint112 reserve0,uint112 reserve1,uint32)',
  'function totalSupply() view returns(uint256)'
];
const coreAbi = [
  'function signer() view returns(address)',
  'function wrappedNative() view returns(address)',
  'function createToken(bytes,bytes) payable returns(address)',
  'function buyByBudget(address,uint256,uint256,uint256,bytes) payable',
  'function sell(address,uint256,uint256,uint256,bytes)',
  'function migrate(address)',
  'event MigrateExecuted(uint256 indexed presetId,address indexed caller,address indexed token,address vault,address migrateModule,bytes8 migrateTagId,uint256 totalRaised,uint256 remainingForSale,bytes32 hookDataHash,uint8 migratedDataVersion,bytes encodedMigratedData)',
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
  async function connect({write=true}={}) {
    if (!registryAddress || registryAddress.toLowerCase() === sourceRegistry) {
      throw Error('Configure a developer-owned OpenFour Testnet Registry.');
    }
    const wallet = getWallet();
    if (!wallet) throw Error('Open a Web3 wallet to use OpenFour.');
    if (BigInt(await wallet.request({method:'eth_chainId'})) !== chainId) {
      throw Error('Switch your wallet to BNB Smart Chain Testnet (chain 97).');
    }
    if (write) await wallet.request({method:'eth_requestAccounts'});
    const provider = new BrowserProvider(wallet);
    const signer = write ? await provider.getSigner() : null;
    const registry = new Contract(registryAddress, registryAbi, provider);
    const [coreAddress, toolsAddress] = await Promise.all([registry.openFourCore(), registry.openFourTool()]);
    const core = new Contract(coreAddress, coreAbi, signer || provider);
    const tools = new Contract(toolsAddress, toolsAbi, provider);
    return {provider, signer, core, tools, registry};
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

  async function readMarket(connection, coin) {
    const {core, provider} = connection;
    if (coin.registry !== registryAddress) throw Error('This coin belongs to a different Testnet Registry.');
    const runtime = await core.tokens(coin.token);
    if (!runtime.exists || runtime.presetId !== presetId) throw Error('This OpenFour market is unavailable.');
    const vault = new Contract(runtime.vault, vaultAbi, provider);
    return {runtime, vault, phase:await vault.phase()};
  }

  async function verifiedPancakePool(connection, coin, runtime) {
    const {core, provider} = connection;
    let event;
    const filter = core.filters.MigrateExecuted(presetId, null, coin.token);
    const birth = Number(runtime.createBlock);
    for (let end = await provider.getBlockNumber(); end >= birth && !event;) {
      const start = Math.max(birth, end - 1999);
      event = (await core.queryFilter(filter, start, end)).at(-1);
      end = start - 1;
    }
    if (!event) throw Error('Waiting for the OpenFour migration event.');
    const migration = event.args;
    if (migration.vault !== runtime.vault || migration.migrateModule !== runtime.migrateModule ||
        migration.migrateTagId !== pancakeV2Migration || migration.migratedDataVersion !== 1n) {
      throw Error('This OpenFour migration uses an unsupported DEX route.');
    }
    const [address] = coder.decode(['address'], migration.encodedMigratedData);
    const pair = new Contract(address, pairAbi, provider);
    const router = new Contract(pancakeV2Router, pancakeRouterAbi, provider);
    const [factory, wrapped, pairFactory, first, second, reserves, lpSupply] = await Promise.all([
      router.factory(), router.WETH(), pair.factory(), pair.token0(), pair.token1(), pair.getReserves(), pair.totalSupply()
    ]);
    const origin = new Contract(factory, ['function getPair(address,address) view returns(address)'], provider);
    const matches = [first,second].includes(coin.token) && [first,second].includes(wrapped) &&
      wrapped === runtime.quoteAsset && factory === pairFactory &&
      await origin.getPair(coin.token,wrapped) === address;
    if (!matches || !reserves.reserve0 || !reserves.reserve1 || !lpSupply) {
      throw Error('The PancakeSwap V2 pool could not be verified.');
    }
    return {address, wrapped, router, hash:event.transactionHash, reserveToken:formatEther(first===coin.token?reserves.reserve0:reserves.reserve1),
      reserveQuote:formatEther(first===wrapped?reserves.reserve0:reserves.reserve1)};
  }

  async function marketState(coin) {
    const connection = await connect({write:false});
    const {runtime, vault, phase} = await readMarket(connection, coin);
    if (phase === 3n) {
      const {address, hash, reserveToken, reserveQuote} = await verifiedPancakePool(connection, coin, runtime);
      return {phase:Number(phase), address, hash, reserveToken, reserveQuote};
    }
    const [raised, remaining, active] = await Promise.all([
      vault.totalRaised(),vault.remainingForSale(),connection.registry.isPresetActive(presetId)
    ]);
    return {phase:Number(phase), paused:runtime.paused || !active, raised:formatEther(raised),
      remaining:formatEther(remaining), target:formatEther(runtime.raiseAmount)};
  }

  async function migrate(coin, submitted) {
    const connection = await connect();
    const {phase, runtime} = await readMarket(connection, coin);
    if (phase !== 2n && phase !== 5n) throw Error('This market is not waiting for migration.');
    if (runtime.paused || !await connection.registry.isPresetActive(presetId)) throw Error('The OpenFour market is paused.');
    await connection.core.migrate.staticCall(coin.token);
    const tx = await connection.core.migrate(coin.token);
    submitted(tx.hash);
    const receipt = await tx.wait();
    if (receipt?.status !== 1) throw Error('Migration reverted.');
    return receipt.hash;
  }

  async function preview(coin, side, input) {
    const connection = await connect();
    const {core, tools, signer, registry, provider} = connection;
    const {runtime, phase} = await readMarket(connection, coin);
    const dex = phase === 3n;
    if (!dex && (phase !== 1n || runtime.paused || !await registry.isPresetActive(presetId) ||
        runtime.quoteAsset !== await core.wrappedNative())) throw Error('This OpenFour market is unavailable.');
    const pool = dex ? await verifiedPancakePool(connection, coin, runtime) : null;
    const contract = new Contract(coin.token, erc20Abi, signer);
    const account = await signer.getAddress();
    const buy = side === 'buy';
    const percent = Number(input);
    if (!buy && (!Number.isInteger(percent) || percent < 1 || percent > 100)) throw Error('Enter a whole percentage from 1 to 100.');
    const amount = buy ? parseEther(input) : await contract.balanceOf(account) * BigInt(percent) / 100n;
    if (amount <= 0n) throw Error(buy ? 'Enter a positive tBNB budget.' : 'You do not hold any coins to sell.');
    const path = dex ? (buy ? [pool.wrapped,coin.token] : [coin.token,pool.wrapped]) : null;
    const router = pool?.router.connect(signer);
    const estimator = buy ? tools.estimateBuyByBudget : tools.estimateSell;
    const quote = dex ? null : await estimator.staticCall(coin.token, account, amount, 0n, '0x');
    const expected = dex ? (await router.getAmountsOut(amount,path))[1] : (buy ? quote.tokenAmount : quote.userReceives);
    if (!expected || (!dex && (!quote.tokenAmount || (!buy && quote.tokenAmount !== amount)))) throw Error('The market cannot fill this order.');
    const minimum = dex ? expected * 99n / 100n : expected;
    if (!minimum) throw Error('Order size is too small.');
    return {
      quantity:formatEther(buy ? expected : amount), total:formatEther(buy ? (dex ? amount : quote.userPays) : expected),
      fee:dex ? null : formatEther(quote.totalFee),
      minimum:formatEther(minimum), dex,
      async confirm(submitted) {
        const sameWallet = async () => {
          const wallet = getWallet();
          if (!wallet || BigInt(await wallet.request({method:'eth_chainId'})) !== chainId ||
              (await wallet.request({method:'eth_accounts'}))[0]?.toLowerCase() !== account.toLowerCase()) {
            throw Error('Wallet or network changed. Preview again.');
          }
        };
        await sameWallet();
        const spender = dex ? router.target : core.target;
        if (!buy && await contract.allowance(account, spender) < amount) {
          const approval = await (await contract.approve(spender, amount)).wait();
          if (approval?.status !== 1) throw Error('Token approval failed.');
          await sameWallet();
        }
        let tx;
        if (dex) {
          const block = await provider.getBlock('latest');
          if (!block) throw Error('Could not read the chain clock.');
          const deadline = BigInt(block.timestamp + 300);
          const swap = buy ? router.swapExactETHForTokens : router.swapExactTokensForETH;
          const args = buy ? [minimum,path,account,deadline,{value:amount}] : [amount,minimum,path,account,deadline,{}];
          await swap.staticCall(...args);
          const gasEstimate = await swap.estimateGas(...args);
          // Leave headroom for dynamic gas in the router's nested pair and token calls.
          args[args.length-1].gasLimit = gasEstimate * 14n / 10n;
          tx = await swap(...args);
        } else {
          tx = buy ? await core.buyByBudget(coin.token, amount, minimum, 0n, '0x', {value:amount}) :
            await core.sell(coin.token, amount, minimum, 0n, '0x');
        }
        submitted(tx.hash);
        const receipt = await tx.wait();
        if (receipt?.status !== 1) throw Error('The trade reverted.');
        return receipt.hash;
      }
    };
  }
  return {enabled:Boolean(registryAddress && registryAddress.toLowerCase() !== sourceRegistry), launch, recover, marketState, migrate, preview};
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const providers = new Set();
  window.addEventListener('eip6963:announceProvider', event => providers.add(event.detail.provider));
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  window.pulseOpenFour = openFour(() => window.ethereum || (providers.size === 1 ? providers.values().next().value : null));
}
