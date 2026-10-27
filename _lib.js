import { createHmac, timingSafeEqual } from "node:crypto";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendJson(res, status, data) {
  res.status(status).setHeader("Cache-Control", "no-store");
  return res.json(data);
}

export function requireMethod(req, methods) {
  if (!methods.includes(req.method)) {
    throw new ApiError(405, "Method not allowed.");
  }
}

export function requestBody(req) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    return req.body;
  }
  throw new ApiError(400, "A JSON request body is required.");
}

function hmac(value) {
  return createHmac("sha256", process.env.ADMIN_PASSWORD).update(value).digest();
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== "string") {
    throw new ApiError(503, "Staff sign-in is not configured. Set ADMIN_PASSWORD in the deployment settings.");
  }
  return safeEqual(password, expected);
}

export function createAdminToken() {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + 8 * 60 * 60 * 1000
  })).toString("base64url");
  return `${payload}.${hmac(payload).toString("base64url")}`;
}

export function requireAdmin(req) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new ApiError(503, "Staff sign-in is not configured. Set ADMIN_PASSWORD in the deployment settings.");
  }
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Please sign in as staff to manage appointments.");
  }
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    throw new ApiError(401, "Your staff session is invalid. Please sign in again.");
  }
  let validSignature = false;
  try {
    validSignature = safeEqual(signature, hmac(payload).toString("base64url").replace(/=+$/, ""));
  } catch {
    throw new ApiError(401, "Your staff session is invalid. Please sign in again.");
  }
  if (!validSignature) {
    throw new ApiError(401, "Your staff session is invalid. Please sign in again.");
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isFinite(data.expiresAt) || data.expiresAt < Date.now()) {
      throw new ApiError(401, "Your staff session has expired. Please sign in again.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Your staff session is invalid. Please sign in again.");
  }
}

function supabaseCredentials() {
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) {
    throw new ApiError(503, "Appointment storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the deployment settings.");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

export async function supabaseRequest(path, options = {}) {
  const { url, key } = supabaseCredentials();
  let response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
      method: options.method || "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(options.prefer ? { Prefer: options.prefer } : {})
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(8000)
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new ApiError(504, "Appointment storage took too long to respond. Please try again.");
    }
    throw new ApiError(502, "Could not reach appointment storage. Please try again later.");
  }
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(502, "Appointment storage returned an unexpected response.");
    }
  }
  if (!response.ok) {
    if (data?.code === "23505") {
      throw new ApiError(409, "This doctor already has an appointment at that time. Choose another slot.");
    }
    if (data?.code === "42P01" || data?.code === "PGRST205") {
      throw new ApiError(503, "Appointment storage is not set up yet. Run database/schema.sql in your Supabase SQL editor.");
    }
    console.error("Supabase request failed:", response.status, data?.code || "unknown");
    throw new ApiError(502, "Could not access appointment storage. Please try again later.");
  }
  return data;
}

export function handleError(res, error) {
  if (error instanceof ApiError) {
    return sendJson(res, error.status, { error: error.message });
  }
  console.error("Unhandled API error:", error);
  return sendJson(res, 500, { error: "The server could not complete the request. Please try again later." });
}
