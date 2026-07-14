/**
 * Regenerate HoodMemes logo + OG with Robinhood neon lime #CCFF00.
 * Usage: node scripts/brand-assets.mjs
 */
import { writeFileSync, mkdirSync, copyFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const APP = join(ROOT, "src/app");
const TMP = join(ROOT, "scripts/.brand-tmp");
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const LIME = "#CCFF00";
const DARK = "#050806";
const CARD = "#0a1208";

mkdirSync(TMP, { recursive: true });

function shot(htmlPath, outPath, w, h) {
  const r = spawnSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--screenshot=${outPath}`,
      `--window-size=${w},${h}`,
      "--default-background-color=00000000",
      `file://${htmlPath}`,
    ],
    { encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  console.log("shot", outPath);
}

// ── Logo 1024² ──────────────────────────────────────────
const logoHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:1024px; height:1024px; overflow:hidden; background:${DARK}; }
.wrap {
  width:1024px; height:1024px;
  display:grid; place-items:center;
  background: radial-gradient(circle at 50% 45%, #0f1a0a 0%, ${DARK} 70%);
}
.card {
  width:640px; height:640px;
  border-radius:140px;
  background: linear-gradient(160deg, #121c0e 0%, #080d06 100%);
  box-shadow:
    0 0 0 1px rgba(204,255,0,0.12),
    0 40px 100px rgba(0,0,0,0.55),
    inset 0 1px 0 rgba(255,255,255,0.04);
  display:grid; place-items:center;
  position:relative;
}
.hm {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 900;
  font-size: 320px;
  letter-spacing: -0.06em;
  color: ${LIME};
  line-height: 1;
  text-shadow: 0 0 60px rgba(204,255,0,0.35);
}
.dot {
  position:absolute;
  top: 92px; right: 92px;
  width: 48px; height: 48px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 20px rgba(255,255,255,0.5);
}
</style></head>
<body><div class="wrap"><div class="card"><span class="hm">HM</span><span class="dot"></span></div></div></body>
</html>`;

// ── OG 1200×630 ─────────────────────────────────────────
const ogHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:1200px; height:630px; overflow:hidden; }
.frame {
  width:1200px; height:630px;
  background:
    radial-gradient(700px 400px at 20% 40%, rgba(204,255,0,0.12), transparent 60%),
    radial-gradient(500px 300px at 85% 70%, rgba(204,255,0,0.06), transparent 55%),
    ${DARK};
  background-image:
    linear-gradient(rgba(204,255,0,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(204,255,0,0.07) 1px, transparent 1px),
    radial-gradient(700px 400px at 20% 40%, rgba(204,255,0,0.14), transparent 60%),
    radial-gradient(500px 300px at 85% 70%, rgba(204,255,0,0.06), transparent 55%),
    linear-gradient(${DARK}, ${DARK});
  background-size: 48px 48px, 48px 48px, auto, auto, auto;
  border: 6px solid ${LIME};
  display:flex;
  align-items:center;
  gap: 56px;
  padding: 0 72px;
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
}
.logo {
  width: 220px; height: 220px;
  border-radius: 48px;
  background: linear-gradient(160deg, #121c0e 0%, #080d06 100%);
  box-shadow:
    0 0 0 1px rgba(204,255,0,0.18),
    0 24px 60px rgba(0,0,0,0.5),
    0 0 80px rgba(204,255,0,0.12);
  display:grid; place-items:center;
  position: relative;
  flex-shrink: 0;
}
.logo .hm {
  font-weight: 900;
  font-size: 110px;
  letter-spacing: -0.06em;
  color: ${LIME};
  line-height: 1;
  text-shadow: 0 0 40px rgba(204,255,0,0.4);
}
.logo .dot {
  position:absolute;
  top: 28px; right: 28px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #fff;
}
.copy { display:flex; flex-direction:column; gap: 14px; }
.badge {
  align-self: flex-start;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #0b0b0b;
  background: ${LIME};
  padding: 8px 16px;
  border-radius: 999px;
}
h1 {
  font-size: 84px;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: #fff;
  line-height: 1;
}
.tag {
  font-size: 32px;
  font-weight: 800;
  color: ${LIME};
  letter-spacing: -0.02em;
}
.meta {
  font-size: 22px;
  font-weight: 600;
  color: rgba(255,255,255,0.55);
  margin-top: 4px;
}
.url {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.02em;
}
</style></head>
<body>
<div class="frame">
  <div class="logo"><span class="hm">HM</span><span class="dot"></span></div>
  <div class="copy">
    <div class="badge">● Live · Robinhood Chain</div>
    <h1>HoodMemes</h1>
    <div class="tag">Robinhood Chain Trenches</div>
    <div class="meta">Launch · Trade · Burn</div>
    <div class="url">hoodmemes.fun</div>
  </div>
</div>
</body></html>`;

writeFileSync(join(TMP, "logo.html"), logoHtml);
writeFileSync(join(TMP, "og.html"), ogHtml);

const logoPng = join(TMP, "logo.png");
const ogPng = join(TMP, "og.png");
shot(join(TMP, "logo.html"), logoPng, 1024, 1024);
shot(join(TMP, "og.html"), ogPng, 1200, 630);

// Copy masters into public
copyFileSync(logoPng, join(PUBLIC, "logo.png"));
copyFileSync(ogPng, join(PUBLIC, "og.png"));
copyFileSync(ogPng, join(PUBLIC, "og-twitter.png"));
copyFileSync(ogPng, join(PUBLIC, "opengraph-image.png"));
copyFileSync(ogPng, join(PUBLIC, "twitter-image.png"));
copyFileSync(ogPng, join(APP, "opengraph-image.png"));
copyFileSync(ogPng, join(APP, "twitter-image.png"));

// Resize icons via Python/Pillow
const py = `
from PIL import Image
from pathlib import Path

logo = Image.open("${logoPng}").convert("RGBA")
public = Path("${PUBLIC}")
app = Path("${APP}")

# Crop-ish center card is full canvas — just resize
sizes = {
    "icon-512.png": 512,
    "icon-256.png": 256,
    "icon-192.png": 192,
    "favicon-512.png": 512,
    "favicon-192.png": 192,
    "favicon-180.png": 180,
    "apple-touch-icon.png": 180,
    "favicon-48.png": 48,
    "favicon-32.png": 32,
    "favicon-16.png": 16,
    "favicon.png": 32,
}
for name, s in sizes.items():
    logo.resize((s, s), Image.Resampling.LANCZOS).save(public / name, "PNG", optimize=True)
    print("icon", name, s)

# Next app icons
logo.resize((512, 512), Image.Resampling.LANCZOS).save(app / "icon.png", "PNG", optimize=True)
logo.resize((180, 180), Image.Resampling.LANCZOS).save(app / "apple-icon.png", "PNG", optimize=True)

# favicon.ico multi-size
ico_sizes = [(16,16),(32,32),(48,48)]
imgs = [logo.resize(sz, Image.Resampling.LANCZOS) for sz in ico_sizes]
imgs[0].save(public / "favicon.ico", format="ICO", sizes=ico_sizes, append_images=imgs[1:])
print("favicon.ico ok")
`;

writeFileSync(join(TMP, "resize.py"), py);
const pr = spawnSync("python3", [join(TMP, "resize.py")], { encoding: "utf8" });
console.log(pr.stdout);
if (pr.status !== 0) {
  console.error(pr.stderr);
  process.exit(1);
}

console.log("Done — lime brand assets written.");
