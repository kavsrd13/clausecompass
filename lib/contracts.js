import { z } from "zod";
export const requestSchema = z.object({
  text: z.string().min(30).max(80000),
  second: z.string().max(80000).default(""),
  role: z.enum([
    "Neutral reviewer",
    "Service provider",
    "Client",
    "Tenant",
    "Employee",
  ]),
  question: z.string().max(1000).default(""),
});
export const resultSchema = z.object({
  summary: z.string().max(3000),
  findings: z
    .array(
      z.object({
        title: z.string().max(200),
        explanation: z.string().max(1500),
        quote: z.string().min(1).max(2000),
        document: z.enum(["original", "revised"]),
      }),
    )
    .max(30),
  questions: z.array(z.string().max(500)).max(10),
});
export function verify(result, input) {
  return {
    ...result,
    findings: result.findings.filter((f) =>
      (f.document === "original" ? input.text : input.second).includes(f.quote),
    ),
  };
}
