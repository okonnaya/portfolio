// Тонкая обёртка над fetch для запросов к Rails API.
//
// В деве Vite проксирует /api → http://localhost:3000 (см. vite.config.ts),
// поэтому базовый путь относительный. В проде можно задать VITE_API_URL,
// если фронт раздаётся с другого домена, чем бэкенд.
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new ApiError(`GET /api${path} → ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}
