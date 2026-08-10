const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1').replace(
  /\/$/,
  '',
);

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{
      field?: string;
      message?: string;
    }>;
  };
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    const responseDetails = body?.error?.details;
    const details = Array.isArray(responseDetails)
      ? responseDetails.filter(
          (detail): detail is ApiErrorDetail =>
            typeof detail.field === 'string' && typeof detail.message === 'string',
        )
      : [];

    throw new ApiError(
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      details[0]?.message ?? body?.error?.message ?? 'The request could not be completed.',
      details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
