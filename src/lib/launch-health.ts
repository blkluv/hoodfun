/**
 * Launch Health Score — server-side computation.
 */
import {
  createPublicClient,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { ROBINHOOD_CHAIN } from "./chain";
import { factoryAbi, erc20Abi } from "./abis";
import {
  FACTORY_ADDRESS,
  V3_LOCKER_ADDRESS,
  isFactoryConfigured,
  RPC_URL,
} from "./contracts";
import { fetchTokenByAddress } from "./dexscreener";
import { getLaunchMeta } from "./launch-meta";
import {
  type HealthPillar,
  type LaunchHealth,
  gradeFromScore,
  labelFromGrade,
  HEALTH_DISCLAIMER,
} from "./launch-health-shared";

export type { HealthPillar, LaunchHealth, HealthPillarId } from "./launch-health-shared";
export { quickHealthFromCard, gradeFromScore } from "./launch-health-shared";

const ZERO = "0x0000000000000000000000000000000000000000";
const DEAD = "0x000000000000000000000000000000000000dead";

function pc(): PublicClient {
  return createPublicClient({
    chain: {
      id: ROBINHOOD_CHAIN.id,
      name: ROBINHOOD_CHAIN.name,
      nativeCurrency: ROBINHOOD_CHAIN.nativeCurrency,
      rpcUrls: {
        default: { http: [RPC_URL] },
      },
    },
    transport: http(RPC_URL),
  });
}

type HolderRow = { address: string; value: bigint };

async function fetchHolders(
  token: string,
  limit = 25
): Promise<HolderRow[]> {
  const url = `https://robinhoodchain.blockscout.com/api/v2/tokens/${token}/holders?items_count=${limit}`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    items?: Array<{ address?: { hash?: string }; value?: string }>;
  };
  const out: HolderRow[] = [];
  for (const it of data.items ?? []) {
    const a = it.address?.hash;
    const v = it.value;
    if (!a || !v) continue;
    try {
      out.push({ address: a.toLowerCase(), value: BigInt(v) });
    } catch {
      /* */
    }
  }
  return out;
}

async function resolveLaunch(
  client: PublicClient,
  token: Address
): Promise<{
  v3: boolean;
  lpLocked: boolean;
  creator: string | null;
  pool: string | null;
  creatorBps: number | null;
}> {
  let v3 = false;
  let lpLocked = false;
  let creator: string | null = null;
  let pool: string | null = null;
  let creatorBps: number | null = null;

  const meta = await getLaunchMeta(token).catch(() => null);
  if (meta?.v3) {
    v3 = true;
    lpLocked = true;
    creatorBps = 0;
  }
  if (meta?.creator) creator = meta.creator;
  if (meta?.pair) pool = meta.pair;
  if (typeof meta?.creatorBps === "number") creatorBps = meta.creatorBps;
  if (meta?.lpBurned) lpLocked = true;

  if (isFactoryConfigured()) {
    try {
      const pair = (await client.readContract({
        address: FACTORY_ADDRESS as Address,
        abi: factoryAbi,
        functionName: "pairOfToken",
        args: [token],
      })) as Address;
      if (pair && pair.toLowerCase() !== ZERO) {
        v3 = true;
        lpLocked = true;
        pool = pair;
        const launch = (await client.readContract({
          address: FACTORY_ADDRESS as Address,
          abi: factoryAbi,
          functionName: "getLaunchedToken",
          args: [token],
        })) as { deployer: Address; pool: Address; positionId: bigint };
        if (launch?.deployer) creator = launch.deployer;
        if (launch?.pool) pool = launch.pool;
        if (launch?.positionId && launch.positionId > 0n) lpLocked = true;
        creatorBps = 0;
      }
    } catch {
      /* not our factory */
    }
  }

  return { v3, lpLocked, creator, pool, creatorBps };
}

function scoreLp(lpLocked: boolean, v3: boolean): HealthPillar {
  const max = 25;
  if (v3 || lpLocked) {
    return {
      id: "lp",
      label: "LP status",
      score: 25,
      max,
      status: "Locked forever",
      detail: v3
        ? "HoodMemes V3 — position NFT in permanent locker; liquidity cannot be withdrawn."
        : "LP marked locked / burned — principal not withdrawable by creator.",
      tone: "green",
    };
  }
  return {
    id: "lp",
    label: "LP status",
    score: 4,
    max,
    status: "Not verified locked",
    detail:
      "Could not confirm permanent lock. Creator may be able to remove liquidity — dig deeper.",
    tone: "red",
  };
}

function scoreCreator(creatorBps: number | null, v3: boolean): HealthPillar {
  const max = 25;
  if (v3 || creatorBps === 0) {
    return {
      id: "creator",
      label: "Creator allocation",
      score: 25,
      max,
      status: "No free bag",
      detail:
        "No free creator allocation at mint — bag comes from on-chain buy at launch (fairer than free %).",
      tone: "green",
    };
  }
  if (creatorBps == null) {
    return {
      id: "creator",
      label: "Creator allocation",
      score: 10,
      max,
      status: "Unknown",
      detail: "Creator allocation not known for this token.",
      tone: "muted",
    };
  }
  if (creatorBps <= 100) {
    return {
      id: "creator",
      label: "Creator allocation",
      score: 18,
      max,
      status: `${creatorBps / 100}% free`,
      detail: `Creator received ${creatorBps / 100}% at launch.`,
      tone: "green",
    };
  }
  if (creatorBps <= 500) {
    return {
      id: "creator",
      label: "Creator allocation",
      score: 10,
      max,
      status: `${creatorBps / 100}% free`,
      detail: `Creator received ${creatorBps / 100}% at launch — size carefully.`,
      tone: "amber",
    };
  }
  return {
    id: "creator",
    label: "Creator allocation",
    score: 4,
    max,
    status: `${creatorBps / 100}% free`,
    detail: `High free creator allocation (${creatorBps / 100}%).`,
    tone: "red",
  };
}

function scoreLiquidity(liq: number | null): HealthPillar {
  const max = 25;
  if (liq == null) {
    return {
      id: "liquidity",
      label: "Liquidity",
      score: 6,
      max,
      status: "Unindexed",
      detail: "No Dex liquidity figure yet — brand new or not indexed.",
      tone: "muted",
    };
  }
  if (liq >= 50_000) {
    return {
      id: "liquidity",
      label: "Liquidity",
      score: 25,
      max,
      status: "Deep",
      detail: `~$${Math.round(liq).toLocaleString()} pool liquidity.`,
      tone: "green",
    };
  }
  if (liq >= 10_000) {
    return {
      id: "liquidity",
      label: "Liquidity",
      score: 20,
      max,
      status: "Healthy",
      detail: `~$${Math.round(liq).toLocaleString()} pool liquidity.`,
      tone: "green",
    };
  }
  if (liq >= 2_000) {
    return {
      id: "liquidity",
      label: "Liquidity",
      score: 14,
      max,
      status: "Modest",
      detail: `~$${Math.round(liq).toLocaleString()} — usable but thin for size.`,
      tone: "amber",
    };
  }
  if (liq >= 500) {
    return {
      id: "liquidity",
      label: "Liquidity",
      score: 9,
      max,
      status: "Thin",
      detail: `~$${Math.round(liq).toLocaleString()} — high slippage risk.`,
      tone: "amber",
    };
  }
  return {
    id: "liquidity",
    label: "Liquidity",
    score: 4,
    max,
    status: "Very thin",
    detail: `~$${Math.round(liq).toLocaleString()} — easy to move the chart.`,
    tone: "red",
  };
}

function scoreConcentration(
  top10Pct: number | null,
  sampled: number
): HealthPillar {
  const max = 25;
  if (top10Pct == null) {
    return {
      id: "concentration",
      label: "Wallet concentration",
      score: 8,
      max,
      status: "Unknown",
      detail: "Holder data unavailable — concentration not scored fully.",
      tone: "muted",
    };
  }
  const pct = Math.round(top10Pct * 10) / 10;
  if (top10Pct < 20) {
    return {
      id: "concentration",
      label: "Wallet concentration",
      score: 25,
      max,
      status: `Top10 ${pct}%`,
      detail: `Top 10 free wallets hold ~${pct}% (ex pool/locker). Sampled ${sampled} holders.`,
      tone: "green",
    };
  }
  if (top10Pct < 35) {
    return {
      id: "concentration",
      label: "Wallet concentration",
      score: 18,
      max,
      status: `Top10 ${pct}%`,
      detail: `Top 10 free wallets hold ~${pct}%. Moderately distributed.`,
      tone: "green",
    };
  }
  if (top10Pct < 50) {
    return {
      id: "concentration",
      label: "Wallet concentration",
      score: 12,
      max,
      status: `Top10 ${pct}%`,
      detail: `Top 10 free wallets hold ~${pct}% — watch for dumps.`,
      tone: "amber",
    };
  }
  if (top10Pct < 70) {
    return {
      id: "concentration",
      label: "Wallet concentration",
      score: 6,
      max,
      status: `Top10 ${pct}%`,
      detail: `Top 10 free wallets hold ~${pct}% — elevated concentration.`,
      tone: "red",
    };
  }
  return {
    id: "concentration",
    label: "Wallet concentration",
    score: 2,
    max,
    status: `Top10 ${pct}%`,
    detail: `Top 10 free wallets hold ~${pct}% — highly concentrated.`,
    tone: "red",
  };
}

export async function computeLaunchHealth(
  tokenRaw: string
): Promise<LaunchHealth | null> {
  const token = tokenRaw.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) return null;

  const client = pc();
  const addr = token as Address;

  const [launch, dex, holders, totalSupply] = await Promise.all([
    resolveLaunch(client, addr),
    fetchTokenByAddress(token).catch(() => null),
    fetchHolders(token, 25).catch(() => [] as HolderRow[]),
    client
      .readContract({
        address: addr,
        abi: erc20Abi,
        functionName: "totalSupply",
      })
      .catch(() => null as bigint | null),
  ]);

  const pool = (launch.pool || dex?.pairAddress || "").toLowerCase() || null;
  const exclude = new Set(
    [
      ZERO,
      DEAD,
      V3_LOCKER_ADDRESS.toLowerCase(),
      FACTORY_ADDRESS.toLowerCase(),
      pool,
    ].filter(Boolean) as string[]
  );

  let top10Pct: number | null = null;
  let holderCountSampled: number | null = null;

  if (holders.length && totalSupply && totalSupply > 0n) {
    const free = holders.filter((h) => !exclude.has(h.address));
    holderCountSampled = free.length;
    const top = free.slice(0, 10);
    const sum = top.reduce((a, h) => a + h.value, 0n);
    const excludedSum = holders
      .filter((h) => exclude.has(h.address))
      .reduce((a, h) => a + h.value, 0n);
    const freeSupply =
      totalSupply > excludedSum ? totalSupply - excludedSum : totalSupply;
    if (freeSupply > 0n) {
      top10Pct = Number((sum * 10000n) / freeSupply) / 100;
      if (top10Pct > 100) top10Pct = 100;
    }
  }

  const liq = dex?.liquidity ?? null;
  const pillars: HealthPillar[] = [
    scoreLp(launch.lpLocked, launch.v3),
    scoreCreator(launch.creatorBps, launch.v3),
    scoreLiquidity(liq),
    scoreConcentration(top10Pct, holderCountSampled ?? 0),
  ];

  const score = Math.min(
    100,
    pillars.reduce((s, p) => s + p.score, 0)
  );
  const grade = gradeFromScore(score);

  return {
    token: token.toLowerCase(),
    score,
    grade,
    label: labelFromGrade(grade),
    pillars,
    facts: {
      v3: launch.v3,
      lpLocked: launch.lpLocked,
      creatorBps: launch.creatorBps,
      liquidityUsd: liq,
      top10Pct,
      holderCountSampled,
      creator: launch.creator,
      pool,
    },
    disclaimer: HEALTH_DISCLAIMER,
    updatedAt: Date.now(),
  };
}
