"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { ConnectModal } from "./ConnectModal";

export function RequireAuth({
  children,
  title,
  blurb,
}: {
  children: ReactNode;
  title?: string;
  blurb?: string;
}) {
  const { ready, isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);

  if (!ready) {
    return (
      <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <h2 className="text-lg font-bold text-white">
            {title ?? "Log in to continue"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/45">
            {blurb ??
              "Connect MetaMask or open a private quick wallet. Your keys stay on your device."}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 rounded-xl bg-[#00c805] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#00e006]"
          >
            Log in
          </button>
        </div>
        <ConnectModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return <>{children}</>;
}
