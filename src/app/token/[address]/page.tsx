import { fetchTokenByAddress } from "@/lib/dexscreener";
import { TokenPageClient } from "@/components/TokenPageClient";

export const revalidate = 15;

export default async function TokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ market?: string }>;
}) {
  const { address } = await params;
  const sp = await searchParams;
  const dexToken = await fetchTokenByAddress(address).catch(() => null);

  return (
    <TokenPageClient
      address={address}
      marketHint={sp.market ?? null}
      dexToken={dexToken}
    />
  );
}
