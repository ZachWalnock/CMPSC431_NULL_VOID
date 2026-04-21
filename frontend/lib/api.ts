export type ApiError = {
  error?: string;
  errors?: Record<string, string>;
};

async function parseJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/backend${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await parseJson(response);

  if (!response.ok) {
    throw data as ApiError;
  }

  return data as T;
}
