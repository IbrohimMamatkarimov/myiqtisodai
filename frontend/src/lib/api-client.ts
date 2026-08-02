import axios from 'axios';
import { useAuthStore } from './auth-store';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
});

/**
 * FastAPI error responses aren't always a plain string - validation errors
 * (422) come back as `detail: [{ type, loc, msg, input, ctx }, ...]`, and
 * some handlers send `detail: { message: '...' }`. Pages used to render
 * `err.response.data.detail` directly as JSX, which crashes React with
 * "Objects are not valid as a React child" whenever the backend returns
 * one of those shapes (e.g. submitting an empty/invalid email). This
 * always returns a safe, displayable string.
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const detail = (err as any)?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((d) => (typeof d === 'string' ? d : d?.msg)).filter(Boolean);
    return messages.length > 0 ? messages.join(' ') : fallback;
  }
  if (typeof detail === 'object' && typeof detail.msg === 'string') return detail.msg;
  if (typeof detail === 'object' && typeof detail.message === 'string') return detail.message;
  return fallback;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') window.location.href = '/login';
        }
      } else {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
