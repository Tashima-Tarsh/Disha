import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { SharedConversation } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadShare(shareId: string): Promise<SharedConversation | null> {
  const headerStore = headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;
  const response = await fetch(`${baseUrl}/api/share/${shareId}`, { cache: "no-store" });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to load shared conversation");
  }
  return response.json();
}

export default async function SharePage({ params }: { params: { shareId: string } }) {
  const share = await loadShare(params.shareId);
  if (!share) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface-950 px-4 py-10 text-surface-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 rounded-2xl border border-surface-800 bg-surface-900/80 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-surface-500">Shared Conversation</p>
          <h1 className="mt-2 text-2xl font-semibold">{share.title}</h1>
          <p className="mt-2 text-sm text-surface-400">
            {share.messages.length} messages
          </p>
        </div>

        <div className="space-y-4">
          {share.messages.map((message) => (
            <article
              key={message.id}
              className="rounded-2xl border border-surface-800 bg-surface-900/70 p-4"
            >
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-surface-500">
                {message.role}
              </div>
              <div className="whitespace-pre-wrap text-sm text-surface-100">
                {typeof message.content === "string"
                  ? message.content
                  : message.content
                      .filter((block) => block.type === "text")
                      .map((block) => block.text)
                      .join("\n")}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
