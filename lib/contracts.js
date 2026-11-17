import { z } from "zod";
import { LIMITS } from "./limits.js";
export const requestSchema = z.object({
  text: z.string().trim().min(30).max(LIMITS.documentCharacters),
  second: z.string().trim().max(LIMITS.documentCharacters).default(""),
  role: z.enum([
    "Neutral reviewer",
    "Service provider",
    "Client",
    "Tenant",
    "Employee",
  ]),
  question: z.string().trim().max(LIMITS.questionCharacters).default(""),
});
export const resultSchema = z.object({
  summary: z.string().trim().min(1).max(3000),
  findings: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        explanation: z.string().trim().min(1).max(1500),
        quote: z
          .string()
          .min(1)
          .max(2000)
          .refine(
            (value) => value.trim().length > 0,
            "Quote must contain text",
          ),
        document: z.enum(["original", "revised"]),
      }),
    )
    .max(30),
  questions: z.array(z.string().trim().min(1).max(500)).max(10),
});
/** @param {z.infer<typeof resultSchema>} result @param {{text:string,second:string}} input */
export function verify(result, input) {
  return {
    ...result,
    findings: result.findings.filter((f) =>
      (f.document === "original" ? input.text : input.second).includes(f.quote),
    ),
  };
}
