/**
 * HoodV3 creator fee helpers — estimate + claim via permanent locker.
 */
import {
  formatEther,
  formatUnits,
  maxUint128,
  type Address,
  type PublicClient,
} from "viem";
import { factoryAbi, lockerAbi, npmAbi, erc20Abi } from "./abis";
import {
  FACTORY_ADDRESS,
  UNI_V3,
  V3_LOCKER_ADDRESS,
  isFactoryConfigured,
} from "./contracts";

export type FeePosition = {
  token: Address;
  positionId: bigint;
  creator: Address;
  rewardRecipient: Address;
  pairToken: Address;
  creatorShareBps: number;
  /** Total uncollected pair (WETH) in position */
  totalEthWei: bigint;
  /** Total uncollected meme tokens */
  totalMemeWei: bigint;
  creatorEthWei: bigint;
  creatorMemeWei: bigint;
  symbol: string;
  name: string;
  decimals: number;
};

function isZero(a: string) {
  return !a || a === "0x0000000000000000000000000000000000000000";
}

/** Resolve V3 position id for a token (locker.positionOf or factory.getLaunchedToken). */
export async function getPositionId(
  pc: PublicClient,
  token: Address
): Promise<bigint | null> {
  if (!isFactoryConfigured() || isZero(V3_LOCKER_ADDRESS)) return null;
  try {
    const id = (await pc.readContract({
      address: V3_LOCKER_ADDRESS as Address,
      abi: lockerAbi,
      functionName: "positionOf",
      args: [token],
    })) as bigint;
    if (id && id > 0n) return id;
  } catch {
    /* */
  }
  try {
    const launch = (await pc.readContract({
      address: FACTORY_ADDRESS as Address,
      abi: factoryAbi,
      functionName: "getLaunchedToken",
      args: [token],
    })) as { positionId: bigint; pool: Address };
    if (launch?.positionId && launch.positionId > 0n) return launch.positionId;
  } catch {
    /* */
  }
  return null;
}

/**
 * Estimate claimable fees for a meme token's locked V3 position.
 * Uses eth_call simulate of NPM.collect (as locker) then applies creatorShareBps.
 */
export async function estimateFeesForToken(
  pc: PublicClient,
  token: Address
): Promise<FeePosition | null> {
  const positionId = await getPositionId(pc, token);
  if (!positionId) return null;

  let creator: Address = "0x0000000000000000000000000000000000000000";
  let meme: Address = token;
  let pairToken: Address = UNI_V3.weth as Address;
  let creatorShareBps = 5000;
  let rewardRecipient: Address = creator;

  try {
    const meta = (await pc.readContract({
      address: V3_LOCKER_ADDRESS as Address,
      abi: lockerAbi,
      functionName: "positionMeta",
      args: [positionId],
    })) as readonly [Address, Address, Address, number];
    creator = meta[0];
    meme = meta[1];
    pairToken = meta[2];
    creatorShareBps = Number(meta[3]);
    if (isZero(creator)) return null;
  } catch {
    return null;
  }

  try {
    rewardRecipient = (await pc.readContract({
      address: V3_LOCKER_ADDRESS as Address,
      abi: lockerAbi,
      functionName: "rewardRecipient",
      args: [positionId],
    })) as Address;
  } catch {
    rewardRecipient = creator;
  }

  let amount0 = 0n;
  let amount1 = 0n;
  try {
    const sim = await pc.simulateContract({
      address: UNI_V3.npm as Address,
      abi: npmAbi,
      functionName: "collect",
      args: [
        {
          tokenId: positionId,
          recipient: V3_LOCKER_ADDRESS as Address,
          amount0Max: maxUint128,
          amount1Max: maxUint128,
        },
      ],
      account: V3_LOCKER_ADDRESS as Address,
    });
    amount0 = sim.result[0];
    amount1 = sim.result[1];
  } catch {
    // Fallback: tokensOwed only (misses uncollected fee growth)
    try {
      const pos = (await pc.readContract({
        address: UNI_V3.npm as Address,
        abi: npmAbi,
        functionName: "positions",
        args: [positionId],
      })) as readonly [
        bigint,
        Address,
        Address,
        Address,
        number,
        number,
        number,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
      ];
      amount0 = pos[10];
      amount1 = pos[11];
    } catch {
      amount0 = 0n;
      amount1 = 0n;
    }
  }

  const pairLower = pairToken.toLowerCase();
  const memeLower = meme.toLowerCase();
  const [pairAmount, memeAmount] =
    pairLower < memeLower ? [amount0, amount1] : [amount1, amount0];

  const bps = BigInt(creatorShareBps);
  const creatorEthWei = (pairAmount * bps) / 10_000n;
  const creatorMemeWei = (memeAmount * bps) / 10_000n;

  let symbol = "TOKEN";
  let name = "Token";
  let decimals = 18;
  try {
    const [s, n, d] = await Promise.all([
      pc.readContract({
        address: meme,
        abi: erc20Abi,
        functionName: "symbol",
      }) as Promise<string>,
      pc.readContract({
        address: meme,
        abi: erc20Abi,
        functionName: "name",
      }) as Promise<string>,
      // decimals not in our erc20Abi — assume 18 for Hood tokens
      Promise.resolve(18),
    ]);
    symbol = s || symbol;
    name = n || name;
    decimals = d;
  } catch {
    /* */
  }

  return {
    token: meme,
    positionId,
    creator,
    rewardRecipient,
    pairToken,
    creatorShareBps,
    totalEthWei: pairAmount,
    totalMemeWei: memeAmount,
    creatorEthWei,
    creatorMemeWei,
    symbol,
    name,
    decimals,
  };
}

export function formatFeeEth(wei: bigint): string {
  if (wei === 0n) return "0";
  const n = Number(formatEther(wei));
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  if (n > 0) return n.toExponential(2);
  return "0";
}

export function formatFeeTokens(wei: bigint, decimals = 18): string {
  if (wei === 0n) return "0";
  const n = Number(formatUnits(wei, decimals));
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(2);
  if (n > 0) return n.toPrecision(3);
  return "0";
}

export { V3_LOCKER_ADDRESS, lockerAbi };
