/**
 * Same-chain Uniswap swaps on Robinhood Chain (4663).
 */

import type { Address, Hex } from "viem";
import { encodeFunctionData, parseEther } from "viem";
import { WETH_ADDRESS } from "./chain";

export const SWAP_ROUTER02 =
  "0xCaf681a66D020601342297493863E78C959E5cb2" as const;
export const V2_ROUTER =
  "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba" as const;

/** Default fee tier for HoodMemes V3 launches */
export const DEFAULT_V3_FEE = 10_000;

const swapRouter02Abi = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

const v2RouterAbi = [
  {
    type: "function",
    name: "swapExactETHForTokens",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "swapExactTokensForETH",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

export const erc20ApproveAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type SwapTx = {
  to: Address;
  data: Hex;
  value: bigint;
};

/** Buy token with native ETH on V3 (1% fee default for Hood launches). */
export function buildV3BuyEth(params: {
  token: Address;
  recipient: Address;
  amountEth: string;
  fee?: number;
  amountOutMinimum?: bigint;
}): SwapTx {
  const amountIn = parseEther(params.amountEth || "0");
  const data = encodeFunctionData({
    abi: swapRouter02Abi,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: WETH_ADDRESS as Address,
        tokenOut: params.token,
        fee: params.fee ?? DEFAULT_V3_FEE,
        recipient: params.recipient,
        amountIn,
        amountOutMinimum: params.amountOutMinimum ?? 0n,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  return { to: SWAP_ROUTER02, data, value: amountIn };
}

/** Buy token with native ETH on Uniswap V2. */
export function buildV2BuyEth(params: {
  token: Address;
  recipient: Address;
  amountEth: string;
  amountOutMin?: bigint;
}): SwapTx {
  const amountIn = parseEther(params.amountEth || "0");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
  const data = encodeFunctionData({
    abi: v2RouterAbi,
    functionName: "swapExactETHForTokens",
    args: [
      params.amountOutMin ?? 0n,
      [WETH_ADDRESS as Address, params.token],
      params.recipient,
      deadline,
    ],
  });
  return { to: V2_ROUTER, data, value: amountIn };
}

/** Sell token for ETH on V3. Caller must approve SwapRouter02 first. */
export function buildV3SellToken(params: {
  token: Address;
  recipient: Address;
  amountIn: bigint;
  fee?: number;
  amountOutMinimum?: bigint;
}): SwapTx {
  const data = encodeFunctionData({
    abi: swapRouter02Abi,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: params.token,
        tokenOut: WETH_ADDRESS as Address,
        fee: params.fee ?? DEFAULT_V3_FEE,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum ?? 0n,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  return { to: SWAP_ROUTER02, data, value: 0n };
}

export function buildApprove(params: {
  token: Address;
  spender: Address;
  amount: bigint;
}): SwapTx {
  const data = encodeFunctionData({
    abi: erc20ApproveAbi,
    functionName: "approve",
    args: [params.spender, params.amount],
  });
  return { to: params.token, data, value: 0n };
}
