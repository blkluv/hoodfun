/**
 * Shared Launch Health types + client-safe helpers (no server imports).
 */

export type HealthPillarId =
  | "lp"
  | "creator"
  | "liquidity"
  | "concentration";

export type HealthPillar = {
  id: HealthPillarId;
  label: string;
  score: number;
  max: number;
  status: string;
  detail: string;
  tone: "green" | "amber" | "red" | "muted";
};

export type LaunchHealth = {
  token: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  pillars: HealthPillar[];
  facts: {
    v3: boolean;
    lpLocked: boolean;
    creatorBps: number | null;
    liquidityUsd: number | null;
    top10Pct: number | null;
    holderCountSampled: number | null;
    creator: string | null;
    pool: string | null;
  };
  disclaimer: string;
  updatedAt: number;
};

export function gradeFromScore(score: number): LaunchHealth["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function labelFromGrade(g: LaunchHealth["grade"]): string {
  switch (g) {
    case "A":
      return "Strong signals";
    case "B":
      return "Solid scan";
    case "C":
      return "Mixed — dig deeper";
    case "D":
      return "Elevated risk signals";
    default:
      return "Weak / incomplete data";
  }
}

/** Client-side quick estimate for board cards (no holders). */
export function quickHealthFromCard(input: {
  isNative?: boolean;
  liquidity?: number | null;
  source?: string;
}): { score: number; grade: LaunchHealth["grade"]; hint: string } {
  let score = 0;
  if (input.isNative || input.source === "hoodfun") {
    score += 50;
  } else {
    score += 12;
  }
  const liq = input.liquidity ?? 0;
  if (liq >= 50_000) score += 25;
  else if (liq >= 10_000) score += 20;
  else if (liq >= 2_000) score += 14;
  else if (liq >= 500) score += 9;
  else if (liq > 0) score += 4;
  else score += 6;
  score += 8;
  score = Math.min(100, score);
  return {
    score,
    grade: gradeFromScore(score),
    hint: input.isNative ? "HM launch · open for full score" : "Partial score",
  };
}

export const HEALTH_DISCLAIMER =
  "Launch Health helps you scan faster — it is not financial advice, not a safety rating, and not a guarantee. Always DYOR.";
