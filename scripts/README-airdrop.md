# ERC-20 airdrop (cast)

Send a **fixed** amount of tokens to each address in a CSV. Built for Robinhood Chain (4663).

## 1. Prepare CSV

```text
0xabc...
0xdef...,optional note
```

- One wallet per line  
- `#` comments OK  
- Duplicates / invalid / zero / dead skipped  

## 2. Env

```bash
cd /Users/danny/hoodfun

export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
export PRIVATE_KEY=0xYOUR_KEY          # sender — must hold tokens + ETH
export TOKEN=0xA7766b509402F5f318722293C602BaDde9530A2e   # HOODMEMES
export AMOUNT_HUMAN=10000              # whole tokens (18 decimals)
export CSV=./scripts/holders.csv
```

Optional:

```bash
export START_FROM=51      # resume after first 50
export MAX_SENDS=50       # only send 50 this run
export SLEEP_SEC=0.2
```

## 3. Dry run (no txs)

```bash
chmod +x scripts/airdrop-erc20.sh
./scripts/airdrop-erc20.sh dry
```

Checks: address count, token balance, ETH, estimated gas.

## 4. Send

```bash
./scripts/airdrop-erc20.sh send
```

Logs to `holders.airdrop-log.txt` next to the CSV.

## Cost (approx, RH)

~**0.001 ETH** for ~300 transfers at current RH gas (varies). Dry run prints a live estimate.

## Safety

- Always `dry` first  
- Start with `MAX_SENDS=3` test wallets  
- Thin LP: large airdrops → dumps  
- Never commit `PRIVATE_KEY` or real holder CSVs to git  

## Snapshot tip (CASHCAT etc.)

Export holders from Blockscout / Dune / your own indexer into CSV, then filter to top N before airdrop.
