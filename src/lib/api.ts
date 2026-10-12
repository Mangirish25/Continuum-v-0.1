import { supabase, isSupabaseConfigured } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
    // Fallback to locally stored dev token if any
    return localStorage.getItem('continuum_auth_token');
  } catch {
    return localStorage.getItem('continuum_auth_token');
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson?.error?.message || errJson?.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Administrator Authentication Helpers
export async function registerAdministrator(payload: {
  name: string;
  email: string;
  password: string;
  confirm_password?: string;
  invite_code?: string;
}) {
  // If Supabase is configured in frontend, try Supabase signup directly
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.name,
          role: 'admin',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    // Provision admin profile on backend
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Otherwise, use backend registration endpoint which handles Supabase/PostgreSQL provisioning
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.access_token) {
    localStorage.setItem('continuum_auth_token', res.access_token);
  }

  return res;
}

export async function loginAdministrator(email: string, password: string) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
    if (data.session?.access_token) {
      localStorage.setItem('continuum_auth_token', data.session.access_token);
    }
    return data;
  }

  // Fallback to backend login endpoint
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (res.access_token) {
    localStorage.setItem('continuum_auth_token', res.access_token);
  }

  return res;
}

// Knowledge Sources API Helpers
export interface RegisteredSource {
  id: string;
  source_type: string;
  name: string;
  url?: string;
  external_resource_id: string;
  project_id?: string;
  project_name?: string;
  employee_id?: string;
  employee_name?: string;
  status: 'PENDING' | 'NEEDS_AUTH' | 'READY' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'DISABLED' | string;
  last_synced_at?: string;
  last_successful_sync_at?: string;
  last_sync_error?: string;
  resource_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export async function getSources(params?: { provider?: string; status?: string }): Promise<RegisteredSource[]> {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch<RegisteredSource[]>(`/sources${query ? `?${query}` : ''}`);
}

export async function createSource(payload: {
  source_type: string;
  name: string;
  url?: string;
  external_resource_id?: string;
  project_id?: string;
  employee_id?: string;
  resource_metadata?: Record<string, any>;
}): Promise<RegisteredSource> {
  return apiFetch<RegisteredSource>('/sources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function syncSource(sourceId: string) {
  return apiFetch(`/sources/${sourceId}/sync`, { method: 'POST' });
}

export async function deleteSource(sourceId: string, hardDelete = false) {
  return apiFetch(`/sources/${sourceId}?hard_delete=${hardDelete}`, { method: 'DELETE' });
}
