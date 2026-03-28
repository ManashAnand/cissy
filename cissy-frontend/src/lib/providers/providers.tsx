"use client";

import { Toaster } from "@/components/ui/sonner";
import { UiChromeProvider } from "@/lib/ui-chrome-context";
import { QueryProvider } from "@/lib/providers/query-provider";
import { StoreProvider } from "@/lib/providers/store-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <QueryProvider>
        <UiChromeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </UiChromeProvider>
      </QueryProvider>
    </StoreProvider>
  );
}
