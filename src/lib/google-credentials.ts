// konsoleH forbids double quotes in env values, so the key may also be provided as base64.
export function parseServiceAccountKey(value: string) {
  const raw = value.trim()
  return JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'))
}
