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
      dexToken={identity?.dexToken ?? null}
      initialSymbol={identity?.symbol ?? null}
      initialName={identity?.name ?? null}
    />
  );
}
