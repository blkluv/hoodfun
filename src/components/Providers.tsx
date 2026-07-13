"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "./Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
