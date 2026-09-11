import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_AUDITOR_API_URL: z
    .url()
    .default('http://localhost:3000')
    .transform((url) => url.replace(/\/$/, '')),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: { NEXT_PUBLIC_AUDITOR_API_URL?: string }): Env {
  const value = source.NEXT_PUBLIC_AUDITOR_API_URL;
  return envSchema.parse({
    NEXT_PUBLIC_AUDITOR_API_URL: value && value.length > 0 ? value : undefined,
  });
}

export const env = parseEnv({
  NEXT_PUBLIC_AUDITOR_API_URL: process.env.NEXT_PUBLIC_AUDITOR_API_URL,
});
