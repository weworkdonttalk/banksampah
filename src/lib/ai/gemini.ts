import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Singleton client (server-side only)
let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (typeof window !== "undefined") {
    throw new Error("Gemini client must only be initialized on the server");
  }
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
}

// In-memory sliding window rate limiter: max 10 calls per minute per user
const userCallTimes = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_CALLS_PER_MINUTE = 10;

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const times = (userCallTimes.get(userId) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (times.length >= MAX_CALLS_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }
  times.push(now);
  userCallTimes.set(userId, times);
  return { allowed: true, remaining: MAX_CALLS_PER_MINUTE - times.length };
}

// In-memory cache for sensor risk analysis (TTL 60s)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const analysisCache = new Map<string, CacheEntry<unknown>>();

export function getFromCache<T>(key: string): T | null {
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    analysisCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setInCache<T>(key: string, data: T, ttlSeconds = 60): void {
  analysisCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// Safe error logger (never leaks API key or image payload)
export function logAiError(context: string, error: unknown): void {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const sanitized = rawMsg
    .replace(/key=[a-zA-Z0-9_\-]+/gi, "key=***")
    .replace(/AIza[0-9A-Za-z\-_]{35}/g, "AIza***");
  console.error(`[EcoSort AI Error] ${context}: ${sanitized}`);
}

export interface GenerateJSONOptions<T> {
  prompt: string;
  systemInstruction?: string;
  schema?: unknown;
  zodSchema: z.ZodType<T>;
  image?: {
    mimeType: string;
    base64: string;
  };
  userId?: string;
  mockFallback?: () => T | Promise<T>;
  cacheKey?: string;
  cacheTtlSeconds?: number;
}

/**
 * Universal server-side helper for Gemini structured JSON output.
 * Features:
 * - Structured output (responseMimeType: "application/json" + responseSchema)
 * - Strict Zod validation
 * - 15 second timeout
 * - 1 retry on network/transient failure
 * - User rate-limit protection
 * - 60s cache support
 * - Graceful fallback so main user flow never breaks
 */
export async function generateJSON<T>(options: GenerateJSONOptions<T>): Promise<T> {
  const {
    prompt,
    systemInstruction,
    schema,
    zodSchema,
    image,
    userId,
    mockFallback,
    cacheKey,
    cacheTtlSeconds = 60,
  } = options;

  // 1. Check cache
  if (cacheKey) {
    const cached = getFromCache<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
  }

  // 2. Rate limit check
  if (userId) {
    const { allowed } = checkRateLimit(userId);
    if (!allowed) {
      logAiError("rate_limit", `User ${userId} exceeded 10 calls/minute`);
      if (mockFallback) return await mockFallback();
      throw new Error("Batas kuota AI tercapai (maks 10 panggilan per menit). Silakan coba sesaat lagi.");
    }
  }

  // 3. Mock mode check
  const isMockMode = process.env.AI_MOCK === "true";
  const client = getGeminiClient();

  if (isMockMode || !client) {
    if (mockFallback) {
      const fallbackResult = await mockFallback();
      const validated = zodSchema.parse(fallbackResult);
      if (cacheKey) setInCache(cacheKey, validated, cacheTtlSeconds);
      return validated;
    }
    throw new Error("Gemini API key tidak tersedia dan mockFallback tidak disediakan.");
  }

  // 4. Build contents and config
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  parts.push({ text: prompt });

  if (image) {
    const cleanBase64 = image.base64.includes(",")
      ? image.base64.split(",")[1]
      : image.base64;
    parts.push({
      inlineData: {
        mimeType: image.mimeType || "image/jpeg",
        data: cleanBase64,
      },
    });
  }

  const modelName = getGeminiModel();
  let lastError: unknown = null;

  // 5. Call with 15s timeout and 1 retry
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const abortSignal = AbortSignal.timeout(15000);

      const response = await client.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          responseMimeType: "application/json",
          responseSchema: schema as any,
          temperature: 0.2,
          abortSignal,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Model mengembalikan respon kosong");
      }

      const parsedJson = JSON.parse(responseText);
      const validated = zodSchema.parse(parsedJson);

      if (cacheKey) {
        setInCache(cacheKey, validated, cacheTtlSeconds);
      }

      return validated;
    } catch (err: unknown) {
      lastError = err;
      logAiError(`attempt_${attempt}`, err);

      if (attempt < 2) {
        // Short backoff before 1 retry
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  // 6. Graceful degradation: never fail main flow if fallback exists
  if (mockFallback) {
    logAiError("fallback_activated", lastError);
    const fallbackResult = await mockFallback();
    const validated = zodSchema.parse(fallbackResult);
    if (cacheKey) setInCache(cacheKey, validated, cacheTtlSeconds);
    return validated;
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
