"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "./Toast";
import { AnalyticsBeacon } from "./AnalyticsBeacon";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AnalyticsBeacon />
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
