import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AnalyseSchema,
  geminiResponseSchema,
  type Analyse,
  type Context,
} from "./schemas";
import {
  ANALYSE_SYSTEM_PROMPT,
  REFORMULEER_SYSTEM_PROMPT,
  buildAnalyseUserPrompt,
  buildReformuleerUserPrompt,
} from "./prompts";

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY ontbreekt. Voeg deze toe aan .env.local.",
    );
  }
  return new GoogleGenerativeAI(key);
}

const ANALYSE_MODEL = "gemini-2.5-pro";
const FLASH_MODEL = "gemini-2.5-flash";

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 800,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /429|rate|quota|503|unavailable|temporar/i.test(msg);
      if (!retryable || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

export async function analyseToets(
  ctx: Context,
  toetstekst: string,
): Promise<Analyse> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: ANALYSE_MODEL,
    systemInstruction: ANALYSE_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      // @ts-expect-error — SDK type is strict, but Gemini accepts our schema
      responseSchema: geminiResponseSchema,
      temperature: 0.4,
    },
  });

  const userPrompt = buildAnalyseUserPrompt(ctx, toetstekst);

  const result = await withRetry(() =>
    model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    }),
  );

  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `Gemini gaf geen geldige JSON terug:\n${text.slice(0, 500)}`,
    );
  }

  const safe = AnalyseSchema.safeParse(parsed);
  if (!safe.success) {
    throw new Error(
      `Gemini-antwoord matched het schema niet: ${safe.error.message}`,
    );
  }
  return safe.data;
}

export async function reformuleerLeerdoel(
  huidigeLeerdoel: string,
  niveau: string,
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: FLASH_MODEL,
    systemInstruction: REFORMULEER_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.6 },
  });
  const result = await withRetry(() =>
    model.generateContent(buildReformuleerUserPrompt(huidigeLeerdoel, niveau)),
  );
  return result.response.text().trim().replace(/^["']|["']$/g, "");
}
