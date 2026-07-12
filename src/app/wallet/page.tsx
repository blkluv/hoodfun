import { QuickWallet } from "@/components/QuickWallet";

export default function WalletPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Quick wallet</h1>
        <p className="mt-2 text-sm text-white/50">
          Pump-style trading wallet. Deposit ETH on Robinhood Chain to this
          address, then buy/sell without MetaMask popups. Export your key if
          you fund it.
        </p>
      </div>
      <QuickWallet />
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-100/70">
        <strong className="text-amber-200">Not custodial on our servers</strong>{" "}
        — the private key is generated and stored in{" "}
        <em>your browser only</em>. Clearing site data loses access unless you
        exported the key. Do not put life-changing money here.
      </div>
    </div>
  );
}
