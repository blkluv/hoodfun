# Exit old HOODMEMES V2 LP (max ETH recovery)

## Do **not** sell tokens first

You own **~100%** of the Uni V2 LP for:

| | |
|---|---|
| Token | `0xA7766b509402F5f318722293C602BaDde9530A2e` |
| Pair | `0x63E09D735a49733Bf6BdEcff84C33d23A1366492` |
| Router | `0x89e5DB8B5aA49aA85AC63f691524311AEB649eba` |
| Your wallet | `0x426E924063cD9F8B1cd659B0A55639Eaf630A17D` |

Pool holds ~**0.021 ETH** + ~943M tokens.  
Your wallet also holds ~56M free tokens + ~0.011 ETH.

### Why not sell first?

Selling dumps into **your own** pool (you are basically the only LP). You pay swap fees to yourself for no gain, then remove leftover LP. **Worse or equal** vs removing LP directly.

### Max-value order

1. **Remove 100% LP** → reclaim ~0.021 ETH + ~943M worthless tokens  
2. **Ignore / burn** leftover tokens — no bid without LP  
3. Keep the ETH for V3 relaunch (~0.05+ buy recommended)  
4. Do **not** hold bags hoping they pump

### Via Uniswap UI

1. Open https://app.uniswap.org/positions?chain=robinhood (or Pool → V2 positions)  
2. Find HOODMEMES / WETH pair  
3. Remove 100% liquidity → receive ETH + tokens  
4. Done

### Via cast (if you have PRIVATE_KEY)

```bash
export RPC=https://rpc.mainnet.chain.robinhood.com
export PK=0x...
export WALLET=0x426E924063cD9F8B1cd659B0A55639Eaf630A17D
export PAIR=0x63E09D735a49733Bf6BdEcff84C33d23A1366492
export TOKEN=0xA7766b509402F5f318722293C602BaDde9530A2e
export ROUTER=0x89e5DB8B5aA49aA85AC63f691524311AEB649eba

LP=$(cast call $PAIR "balanceOf(address)(uint256)" $WALLET --rpc-url $RPC)
echo "LP bal: $LP"

# approve router
cast send $PAIR "approve(address,uint256)" $ROUTER $LP --private-key $PK --rpc-url $RPC

DEADLINE=$(($(date +%s) + 1200))
cast send $ROUTER \
  "removeLiquidityETH(address,uint256,uint256,uint256,address,uint256)" \
  $TOKEN $LP 0 0 $WALLET $DEADLINE \
  --private-key $PK --rpc-url $RPC
```

After remove, wallet ETH ≈ previous + ~0.021. Tokens in wallet are scrap — optional burn.
