"use client";

import { Navbar } from "@/components/common/layout/navbar";
import { useUiChrome } from "@/lib/ui-chrome-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { zoom } = useUiChrome();

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-b from-violet-50/70 via-background to-muted/40 dark:from-violet-950/20 dark:via-background dark:to-muted/20"
      style={{ zoom: zoom / 100 }}
    >
      <Navbar />
      <main className="flex-1 container max-w-[1400px] py-6 sm:py-8 lg:py-10 px-4 sm:px-6">
        {children}
      </main>
    </div>
  );
}
