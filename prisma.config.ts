import { defineConfig } from "@prisma/config";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"] || "postgresql://postgres.cvlhbiwyrtxzohszsohn:Hanif%23260822@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  },
});
