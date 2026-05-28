function parsePositiveMinutes(env: string | undefined, fallbackMinutes: number): number {
  const parsed = Number(env);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackMinutes;
  return parsed;
}

/** Duração máxima da sessão (login até logout automático). Padrão: 8 horas. */
export const SESSION_MAX_AGE_MINUTES = parsePositiveMinutes(
  process.env.SESSION_MAX_AGE_MINUTES,
  480,
);

/** Tempo sem atividade antes de encerrar a sessão. Padrão: 30 minutos. */
export const SESSION_IDLE_TIMEOUT_MINUTES = parsePositiveMinutes(
  process.env.SESSION_IDLE_TIMEOUT_MINUTES,
  30,
);

export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_MINUTES * 60;
export const SESSION_IDLE_TIMEOUT_SECONDS = SESSION_IDLE_TIMEOUT_MINUTES * 60;
export const SESSION_IDLE_TIMEOUT_MS = SESSION_IDLE_TIMEOUT_SECONDS * 1000;
