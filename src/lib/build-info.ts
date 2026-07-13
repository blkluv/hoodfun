import packageJson from "../../package.json";
import { FACTORY_ADDRESS } from "./contracts";

/** Baked at build time via next.config `env` + Vercel system vars. */
export function getBuildInfo() {
  const shaRaw =
    process.env.NEXT_PUBLIC_BUILD_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    "dev";
  const sha = shaRaw.slice(0, 7);
  const builtAt =
    process.env.NEXT_PUBLIC_BUILD_TIME ||
    process.env.VERCEL_GIT_COMMIT_DATE ||
    null;
  const version = process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version;
  const factoryShort = FACTORY_ADDRESS
    ? `${FACTORY_ADDRESS.slice(0, 6)}…${FACTORY_ADDRESS.slice(-4)}`
    : "—";

  return {
    version,
    sha,
    builtAt,
    factoryShort,
    factory: FACTORY_ADDRESS,
    label: `v${version} · ${sha}`,
  };
}
