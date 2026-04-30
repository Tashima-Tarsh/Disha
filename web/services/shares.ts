import { nanoid } from "nanoid";
import type { Conversation } from "@/lib/types";
import { audit } from "@/lib/server/audit";
import { hashSecret, verifySecret } from "@/lib/server/crypto";
import { getDbPool } from "@/lib/server/db";
import type { RequestContext } from "@/lib/server/types";

export type ShareVisibility = "public" | "unlisted" | "password";
export type ShareExpiry = "1h" | "24h" | "7d" | "30d" | "never";

export interface StoredShare {
  id: string;
  conversationId: string;
  conversation: Conversation;
  visibility: ShareVisibility;
  passwordHash?: string;
  expiry: ShareExpiry;
  expiresAt?: number;
  createdAt: number;
}

const EXPIRY_MS: Record<ShareExpiry, number | null> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  never: null,
};

const memory = new Map<string, StoredShare>();

function expiresAt(expiry: ShareExpiry, now: number): number | undefined {
  const duration = EXPIRY_MS[expiry];
  return duration === null ? undefined : now + duration;
}

export async function createConversationShare(
  ctx: RequestContext,
  params: { conversation: Conversation; visibility: ShareVisibility; password?: string; expiry: ShareExpiry },
) {
  const id = nanoid(12);
  const now = Date.now();
  const entry: StoredShare = {
    id,
    conversationId: params.conversation.id,
    conversation: params.conversation,
    visibility: params.visibility,
    passwordHash: params.password ? hashSecret(params.password) : undefined,
    expiry: params.expiry,
    expiresAt: expiresAt(params.expiry, now),
    createdAt: now,
  };
  const pool = getDbPool();
  if (pool) {
    await pool.query(
      `insert into shares (id, owner_user_id, conversation_id, conversation, visibility, password_hash, expiry, expires_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8), to_timestamp($9))`,
      [
        entry.id,
        ctx.principal.userId,
        entry.conversationId,
        entry.conversation,
        entry.visibility,
        entry.passwordHash ?? null,
        entry.expiry,
        entry.expiresAt ? Math.floor(entry.expiresAt / 1000) : null,
        Math.floor(entry.createdAt / 1000),
      ],
    );
  } else {
    memory.set(id, entry);
  }
  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "share.create",
    resource: id,
    outcome: "success",
    metadata: { visibility: entry.visibility },
  });
  return entry;
}

export async function getConversationShare(ctx: RequestContext, id: string, password?: string | null) {
  const pool = getDbPool();
  let entry: StoredShare | null = null;
  if (pool) {
    const result = await pool.query("select * from shares where id = $1 and revoked_at is null", [id]);
    if (result.rowCount) {
      const row = result.rows[0];
      entry = {
        id: row.id,
        conversationId: row.conversation_id,
        conversation: row.conversation,
        visibility: row.visibility,
        passwordHash: row.password_hash ?? undefined,
        expiry: row.expiry,
        expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
        createdAt: new Date(row.created_at).getTime(),
      };
    }
  } else {
    entry = memory.get(id) ?? null;
  }
  if (!entry || (entry.expiresAt && Date.now() > entry.expiresAt)) {
    throw Object.assign(new Error("Share not found or expired"), { status: 404 });
  }
  if (entry.visibility === "password" && (!password || !entry.passwordHash || !verifySecret(password, entry.passwordHash))) {
    throw Object.assign(new Error("Password required"), { status: 401, requiresPassword: true });
  }
  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "share.read",
    resource: id,
    outcome: "success",
  });
  return entry;
}

export async function revokeConversationShare(ctx: RequestContext, id: string) {
  const pool = getDbPool();
  let deleted = false;
  if (pool) {
    const result = await pool.query("update shares set revoked_at = now() where id = $1 and revoked_at is null", [id]);
    deleted = (result.rowCount ?? 0) > 0;
  } else {
    deleted = memory.delete(id);
  }
  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "share.delete",
    resource: id,
    outcome: deleted ? "success" : "failure",
  });
  return deleted;
}
