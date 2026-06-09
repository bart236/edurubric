import { z } from "zod";

export const NiveauSchema = z.enum([
  "KB",
  "TL",
  "H",
  "V",
  "KB/TL",
  "TL/H",
  "H/V",
]);
export type Niveau = z.infer<typeof NiveauSchema>;

export const LeerdoelSchema = z.object({
  code: z.string().regex(/^LD[1-9]$/),
  titel: z.string().min(3).max(50),
  leerlingtaal: z.string().min(10).max(200),
});
export type Leerdoel = z.infer<typeof LeerdoelSchema>;

export const MappingItemSchema = z.object({
  vraag: z.string(),
  omschrijving: z.string().max(120),
  leerdoelCodes: z.array(z.string()).min(1).max(2),
  punten: z.number().min(0),
  bedoeldVoor: z.array(NiveauSchema).optional(),
});
export type MappingItem = z.infer<typeof MappingItemSchema>;

export const DrempelSchema = z.object({
  leerdoelCode: z.string(),
  behaaldVanafProcent: z.number().min(50).max(95),
  nogNietTotProcent: z.number().min(10).max(50),
  toelichting: z.string().optional(),
});
export type Drempel = z.infer<typeof DrempelSchema>;

export const AnalyseSchema = z.object({
  leerdoelen: z.array(LeerdoelSchema).min(3).max(7),
  mapping: z.array(MappingItemSchema),
  drempels: z.array(DrempelSchema),
  observatie: z.string().max(300),
});
export type Analyse = z.infer<typeof AnalyseSchema>;

export const ContextSchema = z.object({
  vak: z.string().min(1),
  leerjaar: z.string().min(1),
  niveau: NiveauSchema,
  onderwerp: z.string().min(1).max(60),
  toetsNaam: z.string().min(1).max(60).optional(),
});
export type Context = z.infer<typeof ContextSchema>;

/**
 * JSON Schema voor Gemini structured output (responseSchema).
 * Gemini accepteert OpenAPI 3.0-style schemas — geen $ref, geen oneOf op top-level.
 */
export const geminiResponseSchema = {
  type: "object",
  properties: {
    leerdoelen: {
      type: "array",
      minItems: 3,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          code: { type: "string", description: "LD1 t/m LD9" },
          titel: { type: "string" },
          leerlingtaal: { type: "string", description: "Ik kan ..." },
        },
        required: ["code", "titel", "leerlingtaal"],
      },
    },
    mapping: {
      type: "array",
      items: {
        type: "object",
        properties: {
          vraag: { type: "string", description: "Vraagnummer, bv. 1a, 2, 8c" },
          omschrijving: { type: "string" },
          leerdoelCodes: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: { type: "string" },
          },
          punten: { type: "number" },
          bedoeldVoor: {
            type: "array",
            items: {
              type: "string",
              enum: ["KB", "TL", "H", "V", "KB/TL", "TL/H", "H/V"],
            },
          },
        },
        required: ["vraag", "omschrijving", "leerdoelCodes", "punten"],
      },
    },
    drempels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          leerdoelCode: { type: "string" },
          behaaldVanafProcent: { type: "number" },
          nogNietTotProcent: { type: "number" },
          toelichting: { type: "string" },
        },
        required: [
          "leerdoelCode",
          "behaaldVanafProcent",
          "nogNietTotProcent",
        ],
      },
    },
    observatie: { type: "string" },
  },
  required: ["leerdoelen", "mapping", "drempels", "observatie"],
} as const;
