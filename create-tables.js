import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres.cvlhbiwyrtxzohszsohn:Hanif%23260822@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
      },
    },
  });

  try {
    console.log("Updating Supabase schema for BusinessOwner phone column...");
    await p.$executeRawUnsafe(`
      ALTER TABLE "BusinessOwner" ADD COLUMN IF NOT EXISTS "phone" TEXT;
    `);
    console.log("✅ COLUMN phone ADDED SUCCESSFULLY TO BusinessOwner!");
  } catch (err) {
    console.error("❌ ERROR SCRIPT:", err);
  } finally {
    await p.$disconnect();
  }
}

main();
