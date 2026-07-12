/** Industry-standard launchpad fee presets (basis points, 100 = 1%) */

export type FeeConfig = {
  buyFeeBps: number;
  sellFeeBps: number;
  feeCreatorBps: number;
  feeProtocolBps: number;
  feeBuybackBurnBps: number;
  tokenBurnOnBuyBps: number;
};

export type FeePresetId = "balanced" | "deflationary" | "creator" | "custom";

export const FEE_PRESETS: Record<
  Exclude<FeePresetId, "custom">,
  { label: string; blurb: string; fees: FeeConfig }
> = {
  balanced: {
    label: "Balanced",
    blurb: "1% trade fee · 70% creator · 20% protocol · 10% buyback-burn · 1% token burn on buy",
    fees: {
      buyFeeBps: 100,
      sellFeeBps: 100,
      feeCreatorBps: 7000,
      feeProtocolBps: 2000,
      feeBuybackBurnBps: 1000,
      tokenBurnOnBuyBps: 100,
    },
  },
  deflationary: {
    label: "Deflationary",
    blurb: "1% fee · heavy buyback-burn + 3% token burn on every buy",
    fees: {
      buyFeeBps: 100,
      sellFeeBps: 100,
      feeCreatorBps: 5000,
      feeProtocolBps: 2000,
      feeBuybackBurnBps: 3000,
      tokenBurnOnBuyBps: 300,
    },
  },
  creator: {
    label: "Creator max",
    blurb: "1% fee · 100% to creator · no buyback · no token burn",
    fees: {
      buyFeeBps: 100,
      sellFeeBps: 100,
      feeCreatorBps: 10000,
      feeProtocolBps: 0,
      feeBuybackBurnBps: 0,
      tokenBurnOnBuyBps: 0,
    },
  },
};

export function feeSplitOk(f: FeeConfig): boolean {
  return (
    f.feeCreatorBps + f.feeProtocolBps + f.feeBuybackBurnBps === 10000 &&
    f.buyFeeBps <= 1000 &&
    f.sellFeeBps <= 1000 &&
    f.tokenBurnOnBuyBps <= 2000
  );
}

export function bpsToPct(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}
