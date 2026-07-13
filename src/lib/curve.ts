import {
  createPublicClient,
  http,
  formatEther,
  parseAbiItem,
  type Address,
  type Log,
} from "viem";
import { ROBINHOOD_CHAIN } from "./chain";
import { marketAbi, erc20Abi, factoryAbi } from "./abis";
import { FACTORY_ADDRESS } from "./contracts";

const robinhood = {
  id: ROBINHOOD_CHAIN.id,
  name: ROBINHOOD_CHAIN.name,
  nativeCurrency: ROBINHOOD_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [...ROBINHOOD_CHAIN.rpcUrls.default.http] },
  },
} as const;

function client() {
  return createPublicClient({
    chain: robinhood,
    transport: http(ROBINHOOD_CHAIN.rpcUrls.default.http[0]),
  });
}

export type CurveTrade = {
  type: "buy" | "sell";
  eth: number;
  tokens: number;
  priceEth: number;
  timestamp: number;
  txHash: string;
  blockNumber: number;
};

export type CurveSnapshot = {
  market: Address;
  token: Address;
  creator: Address;
  name: string;
  symbol: string;
  totalSupply: string;
  totalSupplyRaw: string;
  maxSupply: string | null;
  virtualEth: string;
  virtualToken: string;
  realEth: string;
  /** ETH per 1 token (raw spot) */
  priceEth: number;
  /** USD per token if ethUsd provided */
  priceUsd: number | null;
  /** totalSupply * priceEth */
  marketCapEth: number;
  marketCapUsd: number | null;
  /** progress to graduate threshold (0-100) */
  progressPct: number;
  graduateThresholdEth: number;
  graduated: boolean;
  uniswapPair: Address | null;
  ethUsd: number | null;
  fees: {
    buyFeeBps: number;
    sellFeeBps: number;
    feeCreatorBps: number;
    feeProtocolBps: number;
    feeBuybackBurnBps: number;
    tokenBurnOnBuyBps: number;
  };
  trades: CurveTrade[];
  chart: { t: number; priceEth: number; priceUsd: number | null }[];
};

async function fetchEthUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: { priceUsd?: string; chainId?: string }[];
    };
    const ethPair = data.pairs?.find(
      (p) => p.chainId === "ethereum" && p.priceUsd
    );
    const n = Number(ethPair?.priceUsd);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Legacy bonding-factory ABI snippet (v1/v2 curve) */
const legacyFactoryAbi = [
  {
    type: "function",
    name: "marketOfToken",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ type: "address" }],
  },
] as const;

export async function resolveMarket(
  tokenAddress: Address
): Promise<Address | null> {
  if (!FACTORY_ADDRESS) return null;
  const pc = client();
  try {
    const m = (await pc.readContract({
      address: FACTORY_ADDRESS as Address,
      abi: legacyFactoryAbi,
      functionName: "marketOfToken",
      args: [tokenAddress],
    })) as Address;
    if (!m || m === "0x0000000000000000000000000000000000000000") return null;
    return m;
  } catch {
    return null;
  }
}

export async function fetchCurveSnapshot(
  tokenOrMarket: Address,
  opts?: { market?: Address }
): Promise<CurveSnapshot | null> {
  const pc = client();
  let market = opts?.market ?? null;

  // Detect if address is market (has token()) or token
  if (!market) {
    try {
      const t = (await pc.readContract({
        address: tokenOrMarket,
        abi: marketAbi,
        functionName: "token",
      })) as Address;
      if (t && t !== "0x0000000000000000000000000000000000000000") {
        market = tokenOrMarket;
      }
    } catch {
      /* not a market */
    }
  }
  if (!market) {
    market = await resolveMarket(tokenOrMarket);
  }
  if (!market) return null;

  const [
    token,
    creator,
    virtualEth,
    virtualToken,
    realEth,
    fees,
    ethUsd,
    graduated,
    uniswapPair,
    totalSupplyFixed,
    graduateThreshold,
  ] = await Promise.all([
    pc.readContract({
      address: market,
      abi: marketAbi,
      functionName: "token",
    }) as Promise<Address>,
    pc.readContract({
      address: market,
      abi: marketAbi,
      functionName: "creator",
    }) as Promise<Address>,
    pc.readContract({
      address: market,
      abi: marketAbi,
      functionName: "virtualEth",
    }) as Promise<bigint>,
    pc.readContract({
      address: market,
      abi: marketAbi,
      functionName: "virtualToken",
    }) as Promise<bigint>,
    pc.readContract({
      address: market,
      abi: marketAbi,
      functionName: "realEth",
    }) as Promise<bigint>,
    pc.readContract({
      address: market,
      abi: marketAbi,
      functionName: "fees",
    }) as Promise<readonly [number, number, number, number, number, number]>,
    fetchEthUsd(),
    pc
      .readContract({
        address: market,
        abi: marketAbi,
        functionName: "graduated",
      })
      .catch(() => false) as Promise<boolean>,
    pc
      .readContract({
        address: market,
        abi: marketAbi,
        functionName: "uniswapPair",
      })
      .catch(() => "0x0000000000000000000000000000000000000000") as Promise<Address>,
    pc
      .readContract({
        address: market,
        abi: marketAbi,
        functionName: "totalSupplyFixed",
      })
      .catch(() => 0n) as Promise<bigint>,
    pc
      .readContract({
        address: market,
        abi: marketAbi,
        functionName: "graduateThreshold",
      })
      .catch(() => 0n) as Promise<bigint>,
  ]);

  const [name, symbol, totalSupply] = await Promise.all([
    pc.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "name",
    }) as Promise<string>,
    pc.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "symbol",
    }) as Promise<string>,
    pc.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "totalSupply",
    }) as Promise<bigint>,
  ]);

  // Spot: ETH per whole token ≈ virtualEth / virtualToken
  const vEth = Number(formatEther(virtualEth));
  const vTok = Number(formatEther(virtualToken));
  const supply = Number(formatEther(totalSupply));
  const priceEth = vTok > 0 ? vEth / vTok : 0;
  const priceUsd = ethUsd != null ? priceEth * ethUsd : null;
  // Market cap uses fixed max supply when available (Pump-style FDV)
  const mcapBase =
    totalSupplyFixed > 0n ? Number(formatEther(totalSupplyFixed)) : supply;
  const marketCapEth = priceEth * mcapBase;
  const marketCapUsd = priceUsd != null ? priceUsd * mcapBase : null;

  const real = Number(formatEther(realEth));
  const thresh = Number(formatEther(graduateThreshold || 0n));
  const progressPct =
    thresh > 0 ? Math.min(100, (real / thresh) * 100) : graduated ? 100 : 0;
  const maxSup =
    totalSupplyFixed > 0n ? Number(formatEther(totalSupplyFixed)) : null;

  const trades = await fetchTrades(market);
  const chart = buildChart(trades, priceEth, ethUsd);

  const zero = "0x0000000000000000000000000000000000000000";
  return {
    market,
    token,
    creator,
    name,
    symbol,
    totalSupply: supply.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    totalSupplyRaw: totalSupply.toString(),
    maxSupply:
      maxSup != null
        ? maxSup.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : null,
    virtualEth: formatEther(virtualEth),
    virtualToken: formatEther(virtualToken),
    realEth: formatEther(realEth),
    priceEth,
    priceUsd,
    marketCapEth,
    marketCapUsd,
    progressPct,
    graduateThresholdEth: thresh,
    graduated: Boolean(graduated),
    uniswapPair:
      uniswapPair && uniswapPair !== zero ? uniswapPair : null,
    ethUsd,
    fees: {
      buyFeeBps: Number(fees[0]),
      sellFeeBps: Number(fees[1]),
      feeCreatorBps: Number(fees[2]),
      feeProtocolBps: Number(fees[3]),
      feeBuybackBurnBps: Number(fees[4]),
      tokenBurnOnBuyBps: Number(fees[5]),
    },
    trades,
    chart,
  };
}

const buyEvent = parseAbiItem(
  "event Buy(address indexed buyer, address indexed recipient, uint256 ethIn, uint256 tokensOut, uint256 tokensBurned, uint256 feeEth)"
);
const sellEvent = parseAbiItem(
  "event Sell(address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 feeEth)"
);

async function fetchTrades(market: Address): Promise<CurveTrade[]> {
  const pc = client();
  try {
    const latest = await pc.getBlockNumber();
    // RH is new — scan from deploy window (last ~500k blocks max, or from 0 if small)
    const fromBlock = latest > 500_000n ? latest - 500_000n : 0n;

    const [buys, sells] = await Promise.all([
      pc.getLogs({
        address: market,
        event: buyEvent,
        fromBlock,
        toBlock: latest,
      }),
      pc.getLogs({
        address: market,
        event: sellEvent,
        fromBlock,
        toBlock: latest,
      }),
    ]);

    const blockNums = [
      ...new Set(
        [...buys, ...sells].map((l) => l.blockNumber).filter(Boolean) as bigint[]
      ),
    ];
    const blockTimes = new Map<string, number>();
    await Promise.all(
      blockNums.map(async (bn) => {
        try {
          const b = await pc.getBlock({ blockNumber: bn });
          blockTimes.set(bn.toString(), Number(b.timestamp) * 1000);
        } catch {
          blockTimes.set(bn.toString(), Date.now());
        }
      })
    );

    const trades: CurveTrade[] = [];

    for (const log of buys as Log[]) {
      const args = (log as unknown as { args: Record<string, bigint> }).args;
      const eth = Number(formatEther(args.ethIn ?? 0n));
      const tokens = Number(formatEther(args.tokensOut ?? 0n));
      if (tokens <= 0) continue;
      trades.push({
        type: "buy",
        eth,
        tokens,
        priceEth: eth / tokens,
        timestamp: blockTimes.get(String(log.blockNumber)) ?? Date.now(),
        txHash: log.transactionHash ?? "",
        blockNumber: Number(log.blockNumber ?? 0),
      });
    }
    for (const log of sells as Log[]) {
      const args = (log as unknown as { args: Record<string, bigint> }).args;
      const eth = Number(formatEther(args.ethOut ?? 0n));
      const tokens = Number(formatEther(args.tokensIn ?? 0n));
      if (tokens <= 0) continue;
      trades.push({
        type: "sell",
        eth,
        tokens,
        priceEth: eth / tokens,
        timestamp: blockTimes.get(String(log.blockNumber)) ?? Date.now(),
        txHash: log.transactionHash ?? "",
        blockNumber: Number(log.blockNumber ?? 0),
      });
    }

    trades.sort((a, b) => a.blockNumber - b.blockNumber);
    return trades;
  } catch (e) {
    console.error("fetchTrades", e);
    return [];
  }
}

function buildChart(
  trades: CurveTrade[],
  currentPriceEth: number,
  ethUsd: number | null
): CurveSnapshot["chart"] {
  if (trades.length === 0) {
    const now = Date.now();
    return [
      {
        t: now - 60_000,
        priceEth: currentPriceEth,
        priceUsd: ethUsd != null ? currentPriceEth * ethUsd : null,
      },
      {
        t: now,
        priceEth: currentPriceEth,
        priceUsd: ethUsd != null ? currentPriceEth * ethUsd : null,
      },
    ];
  }
  return trades.map((tr) => ({
    t: tr.timestamp,
    priceEth: tr.priceEth,
    priceUsd: ethUsd != null ? tr.priceEth * ethUsd : null,
  }));
}
