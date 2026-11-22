import { API_URL } from '@env';
import { getToken } from './tokenStore';

// Single entry point for every HTTP call to the backend: base URL, timeout,
// Bearer token and normalized errors.

const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
    constructor(message, { status, data = null, timeout = false } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status; // 0 means the request never got an HTTP response.
        this.data = data;
        this.timeout = timeout;
    }
}

// Called when an authenticated request gets a 401: the token expired or the
// session was opened on another device. AuthProvider registers it.
let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

// Ends the session for any channel that learns the token was rejected
// (an HTTP 401 here, or a STOMP ERROR in useServicioSocket).
export const notifyUnauthorized = (message) => {
    if (unauthorizedHandler) unauthorizedHandler(message);
};

const buildUrl = (path, query) => {
    const url = `${API_URL}${path}`;
    if (!query) return url;
    const params = Object.entries(query)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    return params ? `${url}?${params}` : url;
};

const parseBody = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

export const apiRequest = async (
    path,
    { method = 'GET', body, query, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) => {
    const headers = { 'Content-Type': 'application/json' };
    const token = auth ? getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetch(buildUrl(path, query), {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (err) {
        const timeout = err?.name === 'AbortError';
        throw new ApiError(
            timeout ? 'El servidor tardó demasiado en responder.' : 'No se pudo conectar con el servidor.',
            { status: 0, timeout }
        );
    } finally {
        clearTimeout(timer);
    }

    const data = await parseBody(response);

    if (!response.ok) {
        const message = data?.mensaje || data?.message || `Error ${response.status}`;
        if (response.status === 401 && auth) {
            notifyUnauthorized(message);
        }
        throw new ApiError(message, { status: response.status, data });
    }

    return data;
};
