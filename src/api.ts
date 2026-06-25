const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://meridian-api-production-ce31.up.railway.app').replace(/\/$/, '');

// Store token in sessionStorage for persistence across reloads in the same tab
let authToken = sessionStorage.getItem('meridian_token') || '';

export const setToken = (token: string) => {
  authToken = token;
  if (token) {
    sessionStorage.setItem('meridian_token', token);
  } else {
    sessionStorage.removeItem('meridian_token');
  }
};

export const getToken = () => authToken;

export const isLoggedIn = () => !!authToken;

// Helper to make authenticated requests
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errData = await response.json();
      errorMessage = errData.error || errData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// API methods
export const api = {
  auth: {
    register: (body: any) => request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: any) => request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request<any>('/api/auth/me'),
    logout: () => {
      setToken('');
      return Promise.resolve();
    }
  },
  onboarding: {
    getStatus: () => request<{ completed: boolean }>('/api/onboarding/status'),
    getMessage: (body: { message: string }) => request<{ response: string }>('/api/onboarding/message', { method: 'POST', body: JSON.stringify(body) }),
    complete: () => request<any>('/api/onboarding/complete', { method: 'POST' }),
    getHistory: () => request<any[]>('/api/onboarding/history'),
  },
  profile: {
    get: () => request<any>('/api/profile'),
    update: (body: any) => request<any>('/api/profile', { method: 'PUT', body: JSON.stringify(body) }),
  },
  directions: {
    generate: () => request<any>('/api/directions/generate', { method: 'POST' }),
    get: () => request<any>('/api/directions'),
    getById: (id: string) => request<any>(`/api/directions/${id}`),
  },
  path: {
    generate: () => request<any>('/api/path/generate', { method: 'POST' }),
    get: () => request<any>('/api/path'),
    updateMilestone: (index: number, completed: boolean) => 
      request<any>(`/api/path/milestone/${index}`, { method: 'PUT', body: JSON.stringify({ completed }) }),
  },
  checkin: {
    start: () => request<any>('/api/checkin/start', { method: 'POST' }),
    message: (body: { message: string }) => request<{ response: string }>('/api/checkin/message', { method: 'POST', body: JSON.stringify(body) }),
    getHistory: () => request<any[]>('/api/checkin/history'),
  },
  conversation: {
    message: (body: { message: string }) => request<{ response: string }>('/api/conversation/message', { method: 'POST', body: JSON.stringify(body) }),
    getHistory: () => request<any[]>('/api/conversation/history'),
  },
  voice: {
    startSession: () => request<{ sessionId: string }>('/api/voice/session/start', { method: 'POST' }),
    endSession: (sessionId: string) => request<any>(`/api/voice/session/${sessionId}/end`, { method: 'POST' }),
  }
};
