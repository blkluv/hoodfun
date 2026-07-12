"use client";

import { CreateForm } from "@/components/CreateForm";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import type { SiteConfig } from "@/lib/site-config";

export default function CreatePage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  if (config?.maintenanceMode) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-12 text-center text-sm text-amber-100">
        Maintenance mode — launches temporarily disabled.
      </div>
    );
  }

  if (config && !config.launchesEnabled) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center text-sm text-white/50">
        Token launches are paused by admin. Check back soon.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-black text-white sm:text-3xl">
          Launch on Robinhood Chain
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Bonding curve → fees & burns. Login required.
        </p>
      </div>
      {config?.requireLoginToLaunch !== false ? (
        <RequireAuth title="Log in to launch">
          <CreateForm />
        </RequireAuth>
      ) : (
        <CreateForm />
      )}
    </div>
  );
}
