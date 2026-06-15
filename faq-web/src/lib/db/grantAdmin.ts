/**
 * src/lib/db/grantAdmin.ts
 *
 * CLI script to grant admin access to a user by email.
 *
 * Run with:
 *   npm run grant-admin -- user@example.com
 */

import "dotenv/config";
import ConnectDB from "@/lib/mongoClient";

const DB_NAME = process.env.MONGODB_DB ?? "samagama";

async function grantAdmin() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error("Usage: npm run grant-admin -- <email>");
    console.error("Example: npm run grant-admin -- admin@example.com");
    process.exit(1);
  }

  console.log(`🔌  Connecting to MongoDB…`);
  const client = await ConnectDB();
  console.log(`✅  Connected.`);

  const db = client.db(DB_NAME);

  const user = await db.collection("users").findOne({ email });

  if (!user) {
    console.error(`❌  No user found with email: ${email}`);
    await client.close();
    process.exit(1);
  }

  const isAlreadyAdmin = user.isAdmin === true;

  if (isAlreadyAdmin) {
    console.log(`ℹ️  User ${email} is already an admin.`);
  } else {
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { isAdmin: true } }
    );
    console.log(`✅  User ${email} has been granted admin access.`);
  }

  await client.close();
  console.log(`\n🔌  MongoDB disconnected.`);
}

grantAdmin().catch((err) => {
  console.error("❌  Grant admin failed:", err);
  process.exit(1);
});