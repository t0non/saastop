export function sanitizeUazapiPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...payload };
  if (sanitized.token !== undefined) {
    sanitized.token = "[REDACTED]";
  }
  return sanitized;
}
