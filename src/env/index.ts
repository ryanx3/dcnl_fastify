import "dotenv/config";
import z from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(3333),
  USER_CLOUD: z.string(),
  PASSWORD_CLOUD:z.string(),
  USER_ON_PREM:z.string(),
  PASSWORD_ON_PREM:z.string(),
  INSTANCE_CLOUD:z.string(),
  INSTANCE_ON_PREM:z.string(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM_NAME: z.string(),
  SMTP_FROM_EMAIL: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  console.error("❌ Invalid environment variables!", _env.error);
  throw new Error("❌ Invalid environment variables!");
}

export const env = _env.data;
