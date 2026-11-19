import * as z from "zod/mini";
import { requestSchema, snapshotSchema } from "./contracts.js";
export const selectionSchema = z.object({
  days: z.int().check(z.gte(0)),
  first: z.int().check(z.gte(0)),
  last: z.int().check(z.gte(0)),
  duration: z.union([z.literal(1), z.literal(2)]),
});
export const questionRequestSchema = z.object({
  selection: z.optional(selectionSchema),
  profile: requestSchema,
  snapshot: snapshotSchema,
  question: z.string().check(z.trim(), z.minLength(1), z.maxLength(400)),
});

/** @typedef {z.infer<typeof questionRequestSchema>} QuestionRequest */
/** @typedef {z.infer<typeof selectionSchema>} Selection */
