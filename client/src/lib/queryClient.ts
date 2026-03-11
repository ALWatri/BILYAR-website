import { QueryClient, QueryFunction } from "@tanstack/react-query";

const ADMIN_TOKEN_KEY = "bilyar_admin_token";

/** In-memory fallback when Safari/private mode blocks storage */
let adminTokenMemory: string | null = null;

export function setAdminToken(token: string | null): void {
  adminTokenMemory = token;
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {}
}

export function getAdminHeaders(): Record<string, string> {
  let token = adminTokenMemory;
  if (!token) {
    try {
      token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
      if (token) adminTokenMemory = token;
    } catch {}
  }
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let msg = text;
    try {
      const j = JSON.parse(text);
      if (j?.message) msg = j.message;
    } catch {}
    throw new Error(msg);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { ...getAdminHeaders() };
  if (data) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const headers = getAdminHeaders();

    const res = await fetch(url, {
      credentials: "include",
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
