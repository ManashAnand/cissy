import { ChatShell } from "@/components/Chat/chat-shell";

export function BiHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ask your data</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Natural-language questions are sent to the FastAPI service, which runs
          DuckDB and returns tables, SQL, and optional chart metadata.
        </p>
      </div>
      <ChatShell />
    </div>
  );
}
