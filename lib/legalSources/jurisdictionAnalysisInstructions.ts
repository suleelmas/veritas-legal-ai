import type { SupportedJurisdiction } from "./jurisdictionSourcePolicy";

const COMMON_INSTRUCTIONS = `- Never invent statutes, article numbers, case citations, penalties, deadlines or monetary amounts.
- Never treat model general knowledge as a verified legal source.
- Retrieved verified RAG context is required for specific legal claims.
- If sources are insufficient, explicitly say the point could not be verified.
- The selected jurisdiction is authoritative unless the user explicitly selected Auto and Auto already resolved to this jurisdiction.
- Do not silently switch jurisdiction.`;

const JURISDICTION_INSTRUCTIONS: Record<SupportedJurisdiction, string> = {
  TR: `Analyze under Turkish law only.
- Treat retrieved TR RAG sources as the legal authority for specific legal claims.
- Do not apply US, UK or German law as governing law.
- Do not introduce BGB, UCC, US Code, UK legislation or foreign case law unless the uploaded document itself explicitly creates a cross-border issue AND the retrieved verified sources support mentioning it.
- Even in a cross-border case, foreign law must be clearly labelled as secondary context, never silently treated as Turkish governing law.
- EU/international rules may only be mentioned when legally relevant to the document and supported by retrieved sources.
- If a Turkish legal proposition cannot be verified from retrieved sources, say it could not be verified.
${COMMON_INSTRUCTIONS}`,

  US: `Analyze under United States law only.
- Current Veritas US source scope should be treated as federal law unless verified state-law sources are actually present in retrieved RAG context.
- Do not invent or apply Delaware, New York, California or any other state law from model memory.
- If the document specifies a state governing law but verified sources for that state are absent, explicitly state that state-specific verification is required.
- Do not apply Turkish, UK or German law as governing law.
- Foreign/international law may only be mentioned when the document creates a cross-border issue and retrieved sources support it.
- Specific legal propositions must be supported by retrieved sources.
${COMMON_INSTRUCTIONS}`,

  UK: `Analyze using United Kingdom legal sources only.
- Respect territorial/legal-system differences between England and Wales, Scotland, and Northern Ireland.
- Do not claim that a rule applies across the whole UK unless the retrieved source supports that territorial extent.
- If the relevant UK sub-jurisdiction cannot be determined, say so rather than guessing.
- Do not apply Turkish, US or German law as governing law.
- Cross-border foreign law may only be secondary context when explicitly relevant and source-supported.
- Specific legal propositions must be supported by retrieved sources.
${COMMON_INSTRUCTIONS}`,

  DE: `Analyze under German law only.
- Use German federal law and verified German case-law sources.
- EU law may be used only where legally applicable and supported by retrieved EUR-Lex or other verified RAG material.
- Do not apply Turkish, US or UK law as governing law.
- Cross-border foreign law may only be secondary context when explicitly relevant and source-supported.
- Specific legal propositions must be supported by retrieved sources.
${COMMON_INSTRUCTIONS}`,
};

export function getJurisdictionAnalysisInstructions(
  jurisdiction: SupportedJurisdiction
): string {
  const instructions = JURISDICTION_INSTRUCTIONS[jurisdiction];

  if (!instructions) {
    throw new Error(`Unsupported jurisdiction for analysis instructions: ${jurisdiction}`);
  }

  return instructions;
}
