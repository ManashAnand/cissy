"use client";

import Link from "next/link";
import {
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { useUiChrome } from "@/lib/ui-chrome-context";
import { cn } from "@/lib/utils/cn";

export function Navbar() {
  const { zoom, bumpZoom, resetZoom, dark, toggleTheme } = useUiChrome();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/80 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-card/70 dark:border-border/50">
      <div className="container max-w-[1400px] flex min-h-[3.5rem] py-2.5 sm:py-3 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="font-semibold tracking-tight text-foreground truncate"
          >
            Conversational BI
          </Link>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground hidden sm:inline"
          >
            Dashboard
          </Link>
        </div>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm text-muted-foreground shrink-0">
          <Link
            href="/bi"
            className="hidden sm:inline transition-colors hover:text-foreground px-2"
          >
            Ask data
          </Link>
          <div
            className="hidden md:flex items-center gap-0.5 rounded-md border bg-muted/40 px-1"
            aria-label="Zoom"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => bumpZoom(-10)}
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="tabular-nums text-xs text-muted-foreground w-10 text-center">
              {zoom}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => bumpZoom(10)}
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={resetZoom}
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={toggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border bg-muted/50",
              "text-muted-foreground"
            )}
            title="Single-user mode"
            aria-hidden
          >
            <UserRound className="h-4 w-4" />
          </span>
          <span className="sr-only">{siteConfig.name}</span>
        </nav>
      </div>
    </header>
  );
}
