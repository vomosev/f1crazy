// lib/api.js
// Browser API client for the F1 Crazy Express API.
// Nothing in this module performs a network request at import time.

export const API_BASE_URL =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.NEXT_PUBLIC_API_BASE_URL) ||
  'https://f1crazy-api.arx-app.com:4119';

const DEFAULT_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function buildUrl(path) {
  const base = String(API_BASE_URL).replace(/\/+$/, '');
  const suffix = String(path || '').startsWith('/') ? path : `/${path || ''}`;
  return `${base}${suffix}`;
}

function buildQuery(params) {
  if (!params || typeof params !== 'object') return '';
  const search = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

/**
 * Core request helper.
 * Always sends cookies (credentials: 'include'), JSON headers and aborts
 * after a timeout. Throws ApiError on any non-2xx response or network fault.
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = DEFAULT_TIMEOUT_MS,
    signal,
  } = options;

  if (typeof fetch !== 'function') {
    throw new ApiError('Network requests are not available in this environment', 0);
  }

  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;

  let timer = null;
  if (controller) {
    timer = setTimeout(() => {
      try {
        controller.abort();
      } catch (_err) {
        /* no-op */
      }
    }, timeout);

    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else if (typeof signal.addEventListener === 'function') {
        signal.addEventListener('abort', () => {
          try {
            controller.abort();
          } catch (_err) {
            /* no-op */
          }
        });
      }
    }
  }

  const finalHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  const init = {
    method,
    credentials: 'include',
    mode: 'cors',
    headers: finalHeaders,
  };

  if (body !== undefined && body !== null) {
    finalHeaders['Content-Type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  if (controller) init.signal = controller.signal;

  let response;
  try {
    response = await fetch(buildUrl(path), init);
  } catch (err) {
    if (timer) clearTimeout(timer);
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      throw new ApiError('Request timed out. Please try again.', 0);
    }
    throw new ApiError(
      'Could not reach the F1 Crazy servers. Check your connection.',
      0
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  try {
    if (response.status !== 204 && contentType.includes('application/json')) {
      payload = await response.json();
    } else if (response.status !== 204) {
      const text = await response.text();
      payload = text ? { message: text } : null;
    }
  } catch (_err) {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export function getHealth() {
  return request('/api/health', { method: 'GET' });
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export function signup({ username, email, password } = {}) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: { username, email, password },
  });
}

export function login(username, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function getMe() {
  return request('/api/auth/me', { method: 'GET' });
}

/* ------------------------------------------------------------------ */
/* Game                                                                */
/* ------------------------------------------------------------------ */

export function getCharacters() {
  return request('/api/game/characters', { method: 'GET' });
}

export function getItems() {
  return request('/api/game/items', { method: 'GET' });
}

export function selectCharacter(slug) {
  return request('/api/game/character', {
    method: 'POST',
    body: { slug },
  });
}

export function submitRace(result = {}) {
  const {
    characterSlug,
    score,
    laps,
    bestLapMs,
    totalTimeMs,
    items = [],
  } = result;

  return request('/api/game/races', {
    method: 'POST',
    body: {
      characterSlug,
      score,
      laps,
      bestLapMs,
      totalTimeMs,
      items: Array.isArray(items)
        ? items.map((item) => ({
            slug: item && item.slug,
            count: item && item.count,
          }))
        : [],
    },
  });
}

export function getMyRaces(limit = 10) {
  return request(`/api/game/me/races${buildQuery({ limit })}`, {
    method: 'GET',
  });
}

export function getMyStats() {
  return request('/api/game/me/stats', { method: 'GET' });
}

export function getMyInventory() {
  return request('/api/game/me/inventory', { method: 'GET' });
}

/* ------------------------------------------------------------------ */
/* Leaderboard                                                         */
/* ------------------------------------------------------------------ */

export function getLeaderboard({ range = 'all', limit = 20 } = {}) {
  const safeRange = range === 'week' ? 'week' : 'all';
  const numericLimit = Number(limit);
  const safeLimit =
    Number.isFinite(numericLimit) && numericLimit > 0
      ? Math.min(Math.floor(numericLimit), 100)
      : 20;

  return request(
    `/api/leaderboard${buildQuery({ range: safeRange, limit: safeLimit })}`,
    { method: 'GET' }
  );
}

const api = {
  API_BASE_URL,
  ApiError,
  request,
  getHealth,
  signup,
  login,
  logout,
  getMe,
  getCharacters,
  getItems,
  selectCharacter,
  submitRace,
  getMyRaces,
  getMyStats,
  getMyInventory,
  getLeaderboard,
};

export default api;