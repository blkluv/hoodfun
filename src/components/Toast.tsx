"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastItem = {
  id: number;
  message: string;
  tone: "ok" | "err" | "info";
};

type ToastCtx = {
  push: (message: string, tone?: ToastItem["tone"]) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastItem["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-4), { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-3 z-[100] flex w-[min(360px,calc(100vw-1.5rem))] flex-col gap-2 sm:bottom-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border px-3.5 py-2.5 text-sm font-semibold shadow-lg backdrop-blur-xl ${
              t.tone === "err"
                ? "border-rose-500/40 bg-rose-950/90 text-rose-100"
                : t.tone === "info"
                  ? "border-sky-500/35 bg-sky-950/90 text-sky-100"
                  : "border-[#00c805]/35 bg-[#061208]/95 text-[#b8f5b8]"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      push: (m) => {
        if (typeof window !== "undefined") console.log("[toast]", m);
      },
    };
  }
  return ctx;
}
