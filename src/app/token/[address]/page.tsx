import { resolveTokenIdentity } from "@/lib/token-meta";
import { TokenPageClient } from "@/components/TokenPageClient";

export const revalidate = 15;

export default async function TokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ market?: string; pair?: string }>;
}) {
  const { address } = await params;
  const sp = await searchParams;
  const identity = await resolveTokenIdentity(address, sp.pair ?? null).catch(
    () => null
  );

  return (
    <TokenPageClient
      address={address}
      marketHint={sp.market ?? null}
      pairHint={sp.pair ?? identity?.pair ?? null}
      dexToken={
        identity?.dexToken
          ? {
              ...identity.dexToken,
              imageUrl:
                identity.imageUrl || identity.dexToken.imageUrl || null,
            }
          : identity?.imageUrl
            ? ({
                address,
                name: identity.name,
                symbol: identity.symbol,
                pairAddress: identity.pair,
                priceUsd: null,
                marketCap: null,
                volume24h: null,
                volume1h: null,
                volume6h: null,
                priceChange5m: null,
                priceChange1h: null,
                priceChange6h: null,
                priceChange24h: null,
                liquidity: null,
                imageUrl: identity.imageUrl,
                dexscreenerUrl: null,
                createdAt: null,
                source: "hoodfun",
                isNative: true,
                txns24h: null,
                buys24h: null,
                sells24h: null,
                trendScore: 0,
              } as const)
            : null
      }
      initialSymbol={identity?.symbol ?? null}
      initialName={identity?.name ?? null}
    />
  );
}
