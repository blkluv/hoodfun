# HoodMemes V3 — Uniswap V3 direct launch

LaunchHood-compatible stack for Robinhood Chain (4663).

## Architecture

One tx `launchToken`:

1. EIP-1167 clone of `HoodV3Token` (CREATE2 vanity salt optional)
2. Mint full supply to factory
3. Create + initialize Uni V3 pool (1% fee default)
4. Single-sided LP (all tokens, 0 WETH) → `HoodV3Locker` forever
5. Flat `launchFee` → treasury
6. Remaining `msg.value` = creator initial buy via SwapRouter02
7. Activate anti-snipe (default 2% max wallet for 366 blocks)

## RH Uniswap addresses

| Contract | Address |
|---|---|
| V3 Factory | `0x1f7d7550B1b028f7571E69A784071F0205FD2EfA` |
| NPM | `0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3` |
| SwapRouter02 | `0xCaf681a66D020601342297493863E78C959E5cb2` |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |

## Default launch config (configId=0)

- Supply: 1B
- Initial tick: `-204200` (~1.37 ETH FDV)
- maxWallet: 2%
- maxTx: none
- restriction: 366 blocks
- Creator fee share on LP fees: 50% (locker)

## Deploy

```bash
cd contracts
export PRIVATE_KEY=0x...
export PROTOCOL=0xYourTreasury   # optional, defaults to deployer
export LAUNCH_FEE_WEI=500000000000000  # 0.0005 ETH
export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com

forge script script/DeployV3.s.sol:DeployV3 \
  --rpc-url robinhood \
  --broadcast \
  --legacy
```

Copy printed `HoodV3Factory` into frontend:

```bash
# root of hoodfun
export NEXT_PUBLIC_FACTORY_ADDRESS=0x...
```

## Frontend call

```ts
launchToken(
  { name, symbol, metadataURI, rewardRecipient: zeroAddress },
  0n, // configId
  0n, // dexId
  userSalt, // bytes32
  0n, // minTokensOut
  { value: launchFee + initialBuyEth }
)
```

## Exit old V2 HOODMEMES first

You own ~100% of the V2 LP. **Do not sell tokens first.**

1. Remove LP on Uniswap (or router `removeLiquidityETH`) for pair  
   `0x63E09D735a49733Bf6BdEcff84C33d23A1366492`
2. Reclaim ~**0.021 ETH** + dead tokens
3. Ignore/burn leftover HOODMEMES — no external bid without LP
4. Relaunch official brand on V3 factory
