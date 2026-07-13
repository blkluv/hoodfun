/** HoodV3Factory — instant Uniswap V3 launch + locked LP + initial buy */
export const factoryAbi = [
  {
    type: "function",
    name: "launchToken",
    stateMutability: "payable",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "metadataURI", type: "string" },
          { name: "rewardRecipient", type: "address" },
        ],
      },
      { name: "configId", type: "uint256" },
      { name: "dexId", type: "uint256" },
      { name: "userSalt", type: "bytes32" },
      { name: "minTokensOut", type: "uint256" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "pool", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "launchFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "pairOfToken",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getLaunchedToken",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "deployer", type: "address" },
          { name: "pool", type: "address" },
          { name: "pairToken", type: "address" },
          { name: "positionId", type: "uint256" },
          { name: "launchConfigId", type: "uint256" },
          { name: "dexId", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "isHoodToken",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "predictTokenAddress",
    stateMutability: "view",
    inputs: [
      { name: "creator", type: "address" },
      { name: "userSalt", type: "bytes32" },
    ],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getLaunchConfig",
    stateMutability: "view",
    inputs: [{ name: "configId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "pairToken", type: "address" },
          { name: "totalSupply", type: "uint256" },
          { name: "initialTick", type: "int24" },
          { name: "maxWalletBps", type: "uint16" },
          { name: "maxTxBps", type: "uint16" },
          { name: "restrictionBlocks", type: "uint32" },
          { name: "enabled", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "TokenLaunched",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "deployer", type: "address", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "pairToken", type: "address", indexed: false },
      { name: "dexId", type: "uint256", indexed: false },
      { name: "launchConfigId", type: "uint256", indexed: false },
      { name: "positionId", type: "uint256", indexed: false },
      { name: "restrictionEndBlock", type: "uint256", indexed: false },
      { name: "initialBuyEth", type: "uint256", indexed: false },
      { name: "initialBuyTokens", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TokenDeployed",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "deployer", type: "address", indexed: true },
      { name: "pairToken", type: "address", indexed: true },
      { name: "dexId", type: "uint256", indexed: false },
      { name: "launchConfigId", type: "uint256", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
] as const;

/** Legacy V2 instant factory (kept for reading old launches) */
export const factoryV2Abi = [
  {
    type: "function",
    name: "createToken",
    stateMutability: "payable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "totalSupply", type: "uint256" },
      { name: "burnLp", type: "bool" },
      { name: "creatorBps", type: "uint16" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "pair", type: "address" },
    ],
  },
  {
    type: "function",
    name: "pairOfToken",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "launches",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "pair", type: "address" },
      { name: "creator", type: "address" },
      { name: "totalSupply", type: "uint256" },
      { name: "lpEth", type: "uint256" },
      { name: "lpBurned", type: "bool" },
      { name: "createdAt", type: "uint64" },
      { name: "creatorBps", type: "uint16" },
    ],
  },
] as const;

/** Legacy bonding market */
export const marketAbi = [
  {
    type: "function",
    name: "buy",
    stateMutability: "payable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "minTokensOut", type: "uint256" },
    ],
    outputs: [{ name: "tokensToUser", type: "uint256" }],
  },
  {
    type: "function",
    name: "sell",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokensIn", type: "uint256" },
      { name: "minEthOut", type: "uint256" },
    ],
    outputs: [{ name: "ethToUser", type: "uint256" }],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
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
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;

/** Uniswap V2 pair — for removing old LP */
export const uniV2PairAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
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
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
  },
  {
    type: "function",
    name: "token0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "token1",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

export const uniV2RouterAbi = [
  {
    type: "function",
    name: "removeLiquidityETH",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountTokenMin", type: "uint256" },
      { name: "amountETHMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountToken", type: "uint256" },
      { name: "amountETH", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "WETH",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;
