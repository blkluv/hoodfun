import { NextResponse } from "next/server";
import { isAdminSession, getAdminPassword, getAdminWallets } from "@/lib/admin-auth";
import { diagnosePersistence } from "@/lib/config-store";
import { FACTORY_ADDRESS, isFactoryConfigured } from "@/lib/contracts";
import { ROBINHOOD_CHAIN } from "@/lib/chain";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const persistence = await diagnosePersistence();

  let rpcOk = false;
  let rpcError: string | null = null;
  try {
    const res = await fetch(ROBINHOOD_CHAIN.rpcUrls.default.http[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
      cache: "no-store",
    });
    const j = (await res.json()) as { result?: string };
    rpcOk = j.result === `0x${ROBINHOOD_CHAIN.id.toString(16)}` || !!j.result;
  } catch (e) {
    rpcError = e instanceof Error ? e.message : "rpc failed";
  }

  let dexOk = false;
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/search?q=WETH",
      { cache: "no-store" }
    );
    dexOk = res.ok;
  } catch {
    dexOk = false;
  }

  const pw = getAdminPassword();
  const defaultPassword = pw === "hoodmemes-admin";

  return NextResponse.json({
    ...persistence,
    factory: FACTORY_ADDRESS,
    factoryConfigured: isFactoryConfigured(),
    rpcOk,
    rpcError,
    dexOk,
    chainId: ROBINHOOD_CHAIN.id,
    adminWallets: getAdminWallets(),
    defaultPassword,
    buildSha: process.env.NEXT_PUBLIC_BUILD_SHA || process.env.VERCEL_GIT_COMMIT_SHA || null,
    buildVersion: process.env.NEXT_PUBLIC_APP_VERSION || null,
  });
}
