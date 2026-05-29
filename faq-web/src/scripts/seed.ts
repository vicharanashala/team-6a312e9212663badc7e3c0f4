// ============================================================
// ORIGINAL SEED SCRIPT (commented out)
// ============================================================
// import ConnectDB from "../lib/mongoClient";
// // import { faqData } from "../data/faqData";
//
// async function main() {
//   const client = await ConnectDB();
//   const db = client.db("RAG_Project");
//
//   const result = await db.collection("data").insertMany(faqData);
//   console.log(`Seeded ${result.insertedCount} documents.`);
//
//   await client.close();
// }
//
// main().catch((err) => {
//   console.error("Seed failed:", err);
//   process.exit(1);
// });
// ============================================================

/**
 * DB Diagnostic Script
 *
 * Checks whether the app can connect to MongoDB and fetch real data
 * from the `faqs` and `categories` collections.
 *
 * Run with:
 *   npx ts-node -e "require('dotenv').config({ path: '.env.local' })" src/scripts/seed.ts
 * Or (if tsx is available):
 *   npx tsx --env-file=.env.local src/scripts/seed.ts
 */

import ConnectDB from "../lib/mongoClient";

const DB_NAME = process.env.MONGODB_DB ?? "RAG_Project";

async function checkDB() {
  console.log("\n🔍 Connecting to MongoDB...");
  console.log(`   URI: ${(process.env.MONGODB_URI ?? "").replace(/:\/\/.*@/, "://<credentials>@")}`);
  console.log(`   DB : ${DB_NAME}\n`);

  let client;
  try {
    client = await ConnectDB();
    console.log("✅ Connection successful!\n");
  } catch (err) {
    console.error("❌ Connection FAILED:", err);
    process.exit(1);
  }

  const db = client.db(DB_NAME);

  // ── List all collections ────────────────────────────────────────────────────
  const collections = await db.listCollections().toArray();
  console.log(`📦 Collections found (${collections.length}):`);
  for (const col of collections) {
    console.log(`   • ${col.name}`);
  }
  console.log();

  // ── Check `faqs` collection ─────────────────────────────────────────────────
  const faqCount = await db.collection("faqs").countDocuments();
  console.log(`📄 faqs collection     → ${faqCount} document(s)`);

  if (faqCount > 0) {
    const sample = await db.collection("faqs").findOne({});
    console.log("   Sample FAQ document:");
    console.log("  ", JSON.stringify(sample, null, 2).split("\n").join("\n   "));
  } else {
    console.log("   ⚠️  No FAQs found — you may need to seed the database.");
  }

  console.log();

  // ── Check `categories` collection ───────────────────────────────────────────
  const catCount = await db.collection("categories").countDocuments();
  console.log(`📂 categories collection → ${catCount} document(s)`);

  if (catCount > 0) {
    const sample = await db.collection("categories").findOne({});
    console.log("   Sample Category document:");
    console.log("  ", JSON.stringify(sample, null, 2).split("\n").join("\n   "));
  } else {
    console.log("   ⚠️  No categories found — you may need to seed the database.");
  }

  console.log("\n✅ Diagnostic complete.\n");

  await client.close();
}

checkDB().catch((err) => {
  console.error("❌ Diagnostic failed:", err);
  process.exit(1);
});