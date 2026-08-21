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
    console.log("Fixing missing PostgreSQL Enum types in Supabase...");

    await p.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
          CREATE TYPE "OrderStatus" AS ENUM ('MENUNGGU_PEMBAYARAN', 'LUNAS', 'DIBATALKAN');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SenderRole') THEN
          CREATE TYPE "SenderRole" AS ENUM ('PELANGGAN', 'AI', 'ADMIN');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EscalationReason') THEN
          CREATE TYPE "EscalationReason" AS ENUM ('PEMBAYARAN', 'KOMPLAIN', 'NEGO_HARGA', 'PERTANYAAN_DILUAR_DATA', 'LAINNYA');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EscalationStatus') THEN
          CREATE TYPE "EscalationStatus" AS ENUM ('BELUM_SELESAI', 'SELESAI');
        END IF;
      END $$;
    `);

    // Fix Order status
    await p.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;`);
    await p.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::text::"OrderStatus";`);
    await p.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'MENUNGGU_PEMBAYARAN'::"OrderStatus";`);

    // Fix Conversation sender
    await p.$executeRawUnsafe(`ALTER TABLE "Conversation" ALTER COLUMN "sender" DROP DEFAULT;`);
    await p.$executeRawUnsafe(`ALTER TABLE "Conversation" ALTER COLUMN "sender" TYPE "SenderRole" USING "sender"::text::"SenderRole";`);
    await p.$executeRawUnsafe(`ALTER TABLE "Conversation" ALTER COLUMN "sender" SET DEFAULT 'PELANGGAN'::"SenderRole";`);

    // Fix Escalation reason & status
    await p.$executeRawUnsafe(`ALTER TABLE "Escalation" ALTER COLUMN "reason" DROP DEFAULT;`);
    await p.$executeRawUnsafe(`ALTER TABLE "Escalation" ALTER COLUMN "reason" TYPE "EscalationReason" USING "reason"::text::"EscalationReason";`);
    await p.$executeRawUnsafe(`ALTER TABLE "Escalation" ALTER COLUMN "reason" SET DEFAULT 'LAINNYA'::"EscalationReason";`);

    await p.$executeRawUnsafe(`ALTER TABLE "Escalation" ALTER COLUMN "status" DROP DEFAULT;`);
    await p.$executeRawUnsafe(`ALTER TABLE "Escalation" ALTER COLUMN "status" TYPE "EscalationStatus" USING "status"::text::"EscalationStatus";`);
    await p.$executeRawUnsafe(`ALTER TABLE "Escalation" ALTER COLUMN "status" SET DEFAULT 'BELUM_SELESAI'::"EscalationStatus";`);

    console.log("✅ ALL POSTGRESQL ENUM TYPES & COLUMNS FIXED SUCCESSFULLY IN SUPABASE!");
  } catch (err) {
    console.error("❌ ERROR FIX ENUMS:", err);
  } finally {
    await p.$disconnect();
  }
}

main();
