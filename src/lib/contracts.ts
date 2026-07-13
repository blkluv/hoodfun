import { ROBINHOOD_CHAIN } from "./chain";

/**
 * HoodV3Factory on Robinhood Chain (4663).
 * Live: 0x291ED0c4787aA9967dD34eF259A4d03bd1FAf739 (2026-07-13)
 * Override with NEXT_PUBLIC_FACTORY_ADDRESS if needed.
 *
 * Legacy V2 instant (creatorBps): 0x1E89C3EbEa4059D8B1aefc3a2A7e97caF180Ed33
 * Legacy instant v1: 0x2C8D3F42e440068C032eAa8d9695c98e7d642820
 */
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  "0x291ED0c4787aA9967dD34eF259A4d03bd1FAf739") as `0x${string}`;

export const V3_LOCKER_ADDRESS =
  "0x751975C036822F2254Ce7fB449D4C425abd8FbB1" as const;
export const V3_TOKEN_IMPL =
  "0x502490e44e45de00Ca0975eB88ae7ce340dd8556" as const;

/** Official Uniswap V2 router (legacy LP exit only) */
export const UNI_V2_ROUTER =
  "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba" as const;

/** Official Uniswap V3 on RH */
export const UNI_V3 = {
  factory: "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA",
  npm: "0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3",
  swapRouter02: "0xCaf681a66D020601342297493863E78C959E5cb2",
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  fee1pct: 10_000,
} as const;

/** Old official HOODMEMES V2 (exit this before relaunch) */
export const LEGACY_HOODMEMES = {
  token: "0xA7766b509402F5f318722293C602BaDde9530A2e",
  pair: "0x63E09D735a49733Bf6BdEcff84C33d23A1366492",
} as const;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  ROBINHOOD_CHAIN.rpcUrls.default.http[0];

export function isFactoryConfigured(): boolean {
  return Boolean(
    FACTORY_ADDRESS &&
      FACTORY_ADDRESS.startsWith("0x") &&
      FACTORY_ADDRESS.length === 42
  );
}
