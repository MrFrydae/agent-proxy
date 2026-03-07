// Seed a dummy second Anthropic account for testing drag-and-drop reorder
// Run: npx tsx scripts/seed-dummy.ts

import { getDb } from "../src/lib/db";
import { accounts } from "../src/lib/db/schema";
import { encrypt } from "../src/lib/crypto";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

const db = getDb();
const provider = "anthropic";

const existing = db.select().from(accounts).where(eq(accounts.provider, provider)).all();
const maxPriority = existing.reduce((max, a) => Math.max(max, a.priority), 0);

const now = new Date().toISOString();
const id = nanoid();

db.insert(accounts)
  .values({
    id,
    provider,
    label: "Personal",
    apiKey: encrypt("sk-ant-dummy-0000000000000000000000000000000000000000"),
    priority: maxPriority + 1,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  })
  .run();

// eslint-disable-next-line no-console -- CLI script output
console.log(`Inserted dummy account "${id}" with priority ${maxPriority + 1}`);
