import { z } from 'zod'

const Bureau = z.object({
  name: z.string(),
  code: z.string(),
  color: z.string(),
  enabled: z.boolean(),
  order: z.number()
})
const ConfigSchema = z.object({
  bureaus: z.object({ EQ: Bureau, EX: Bureau, TU: Bureau })
})
export type AppConfig = z.infer<typeof ConfigSchema>

export async function getConfig(): Promise<AppConfig> {
  // dynamic import so build tools don't inline JSON
  const raw = (await import('../../data/config/site.json')).default
  return ConfigSchema.parse(raw)
}
