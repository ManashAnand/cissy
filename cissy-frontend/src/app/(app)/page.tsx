import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{siteConfig.name}</h1>
        <p className="text-muted-foreground">{siteConfig.description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Conversational BI</CardTitle>
            <CardDescription>
              Ask questions in English; the API runs SQL against DuckDB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/bi">Open chat</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Backend</CardTitle>
            <CardDescription>
              Configure <code className="text-xs">NEXT_PUBLIC_API_URL</code>{" "}
              to point at your FastAPI server.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
