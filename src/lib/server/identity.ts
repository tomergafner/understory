import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

// Durable anonymous browser identity (CLAUDE.md §14): a cookie, backed by the
// users table. The schema takes a real user_id later without change.
const COOKIE = "understory_uid";

export async function getOrCreateUserId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}
