import { ImageResponse } from "next/og";
import { fetchTokenByAddress } from "@/lib/dexscreener";

export const alt = "HoodMemes token";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  let symbol = "TOKEN";
  let name = "Robinhood Chain";
  let mcap = "—";
  let change = "—";
  let changeColor = "#00c805";
  let imgUrl: string | null = null;

  try {
    const token = await fetchTokenByAddress(address);
    if (token) {
      symbol = token.symbol || symbol;
      name = token.name || name;
      imgUrl = token.imageUrl;
      if (token.marketCap != null) {
        const n = token.marketCap;
        mcap =
          n >= 1e9
            ? `$${(n / 1e9).toFixed(2)}B`
            : n >= 1e6
              ? `$${(n / 1e6).toFixed(2)}M`
              : n >= 1e3
                ? `$${(n / 1e3).toFixed(1)}K`
                : `$${n.toFixed(0)}`;
      }
      if (token.priceChange24h != null) {
        const c = token.priceChange24h;
        change = `${c >= 0 ? "+" : ""}${c.toFixed(1)}%`;
        changeColor = c >= 0 ? "#00c805" : "#f43f5e";
      }
    }
  } catch {
    /* fallback branding */
  }

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #050806 0%, #0a1a0c 45%, #051208 100%)",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,200,5,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,5,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            display: "flex",
          }}
        />
        {/* glow */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: 999,
            background: "rgba(0,200,5,0.18)",
            filter: "blur(80px)",
            left: -80,
            top: 60,
            display: "flex",
          }}
        />

        {/* top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "36px 48px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#0d1a10",
                border: "2px solid rgba(0,200,5,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00c805",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              HM
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{ color: "white", fontSize: 26, fontWeight: 800 }}
              >
                HoodMemes
              </span>
              <span style={{ color: "rgba(0,200,5,0.9)", fontSize: 14 }}>
                hoodmemes.fun
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,200,5,0.12)",
              border: "1px solid rgba(0,200,5,0.4)",
              borderRadius: 999,
              padding: "10px 18px",
              color: "#00c805",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ● LIVE · CHAIN 4663
          </div>
        </div>

        {/* main */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            padding: "0 48px 48px",
            gap: 40,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 36,
              background: "rgba(255,255,255,0.06)",
              border: "2px solid rgba(0,200,5,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              boxShadow: "0 0 60px rgba(0,200,5,0.25)",
            }}
          >
            {imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt=""
                width={180}
                height={180}
                style={{ objectFit: "cover", width: 180, height: 180 }}
              />
            ) : (
              <span
                style={{ color: "#00c805", fontSize: 72, fontWeight: 900 }}
              >
                {symbol.slice(0, 1)}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span
              style={{
                color: "white",
                fontSize: 72,
                fontWeight: 900,
                letterSpacing: -1,
                lineHeight: 1.05,
              }}
            >
              ${symbol}
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 28,
                marginTop: 8,
              }}
            >
              {name}
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 18,
                marginTop: 10,
                fontFamily: "monospace",
              }}
            >
              {short}
            </span>

            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  padding: "14px 22px",
                  minWidth: 160,
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                  Market cap
                </span>
                <span
                  style={{
                    color: "white",
                    fontSize: 32,
                    fontWeight: 800,
                    marginTop: 4,
                  }}
                >
                  {mcap}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 16,
                  padding: "14px 22px",
                  minWidth: 160,
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                  24h
                </span>
                <span
                  style={{
                    color: changeColor,
                    fontSize: 32,
                    fontWeight: 800,
                    marginTop: 4,
                  }}
                >
                  {change}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* bottom accent */}
        <div
          style={{
            height: 8,
            width: "100%",
            background: "#00c805",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
