/** @param {import('zod').infer<typeof import('../contracts.js').resultSchema> & {incomplete?:boolean}} result @param {string} mode */
export function createBrief(result, mode) {
  return `# Before You Sign brief\n\nMode: ${mode}\nStatus: ${result.incomplete ? "Incomplete — some source references could not be validated." : "Source references checked; interpretations require review."}\n\n${result.summary}\n\n${result.findings.map((f) => `## ${f.title}\n${f.explanation}\n\nSource (${f.document}): ${f.quote}`).join("\n\n")}\n\n## Questions\n${result.questions.map((q) => "- " + q).join("\n")}\n\nInformation only; not professional legal advice.`;
}
