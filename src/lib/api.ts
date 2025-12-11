export class ApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface JsonFetchResult<T> {
  data: T;
  response: Response;
}

export const fetchJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<JsonFetchResult<T>> => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const bodyText = await response.text();
    throw new ApiError(`${response.status} ${bodyText}`, response.status, bodyText);
  }
  const data = (await response.json()) as T;
  return { data, response };
};
