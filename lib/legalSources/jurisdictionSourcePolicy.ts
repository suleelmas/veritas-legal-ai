export type SupportedJurisdiction = "TR" | "US" | "UK" | "DE";

export type LegalSourcePolicyEntry = {
  id: string;
  name: string;
  domain: string;
  sourceType:
    | "legislation"
    | "official_gazette"
    | "case_law"
    | "regulator"
    | "regulation";
  priority: "primary" | "secondary";
  enabled: boolean;
  notes?: string;
};

export type JurisdictionSourcePolicy = {
  jurisdiction: SupportedJurisdiction;
  sources: LegalSourcePolicyEntry[];
};

const TR_SOURCES: LegalSourcePolicyEntry[] = [
  {
    id: "tr-uyap-mevzuat",
    name: "UYAP Mevzuat",
    domain: "mevzuat.adalet.gov.tr",
    sourceType: "legislation",
    priority: "primary",
    enabled: true,
  },
  {
    id: "tr-yargitay-karar-arama",
    name: "Yargıtay Karar Arama",
    domain: "karararama.yargitay.gov.tr",
    sourceType: "case_law",
    priority: "primary",
    enabled: true,
  },
  {
    id: "tr-anayasa-mahkemesi-kararlar",
    name: "Anayasa Mahkemesi Kararlar Bilgi Bankası",
    domain: "kararlarbilgibankasi.anayasa.gov.tr",
    sourceType: "case_law",
    priority: "primary",
    enabled: true,
  },
  {
    id: "tr-kvkk",
    name: "KVKK",
    domain: "kvkk.gov.tr",
    sourceType: "regulator",
    priority: "primary",
    enabled: true,
  },
];

const US_SOURCES: LegalSourcePolicyEntry[] = [
  {
    id: "us-us-code",
    name: "U.S. Code / Office of Law Revision Counsel",
    domain: "uscode.house.gov",
    sourceType: "legislation",
    priority: "primary",
    enabled: true,
  },
  {
    id: "us-govinfo",
    name: "GovInfo",
    domain: "govinfo.gov",
    sourceType: "legislation",
    priority: "primary",
    enabled: true,
  },
  {
    id: "us-congress-gov",
    name: "Congress.gov",
    domain: "congress.gov",
    sourceType: "legislation",
    priority: "primary",
    enabled: true,
  },
  {
    id: "us-ecfr",
    name: "eCFR",
    domain: "ecfr.gov",
    sourceType: "regulation",
    priority: "primary",
    enabled: true,
  },
  {
    id: "us-supreme-court",
    name: "Supreme Court of the United States",
    domain: "supremecourt.gov",
    sourceType: "case_law",
    priority: "primary",
    enabled: true,
  },
];

const UK_SOURCES: LegalSourcePolicyEntry[] = [
  {
    id: "uk-legislation-gov-uk",
    name: "legislation.gov.uk",
    domain: "legislation.gov.uk",
    sourceType: "legislation",
    priority: "primary",
    enabled: true,
  },
  {
    id: "uk-find-case-law",
    name: "Find Case Law / The National Archives",
    domain: "caselaw.nationalarchives.gov.uk",
    sourceType: "case_law",
    priority: "primary",
    enabled: true,
  },
  {
    id: "uk-supreme-court",
    name: "UK Supreme Court",
    domain: "supremecourt.uk",
    sourceType: "case_law",
    priority: "primary",
    enabled: true,
  },
];

const DE_SOURCES: LegalSourcePolicyEntry[] = [
  {
    id: "de-gesetze-im-internet",
    name: "Gesetze im Internet",
    domain: "gesetze-im-internet.de",
    sourceType: "legislation",
    priority: "primary",
    enabled: true,
  },
  {
    id: "de-bundesgesetzblatt",
    name: "Bundesgesetzblatt / Verkündungsplattform",
    domain: "recht.bund.de",
    sourceType: "official_gazette",
    priority: "primary",
    enabled: true,
  },
  {
    id: "de-bundesgerichtshof",
    name: "Bundesgerichtshof",
    domain: "bundesgerichtshof.de",
    sourceType: "case_law",
    priority: "primary",
    enabled: true,
  },
  {
    id: "de-bundesverfassungsgericht",
    name: "Bundesverfassungsgericht",
    domain: "bundesverfassungsgericht.de",
    sourceType: "case_law",
    priority: "primary",
    enabled: true,
  },
  {
    id: "de-eur-lex",
    name: "EUR-Lex",
    domain: "eur-lex.europa.eu",
    sourceType: "legislation",
    priority: "secondary",
    enabled: true,
    notes: "EU law may apply in Germany; use only when legally relevant.",
  },
];

export const JURISDICTION_SOURCE_POLICIES: JurisdictionSourcePolicy[] = [
  { jurisdiction: "TR", sources: TR_SOURCES },
  { jurisdiction: "US", sources: US_SOURCES },
  { jurisdiction: "UK", sources: UK_SOURCES },
  { jurisdiction: "DE", sources: DE_SOURCES },
];

const POLICY_BY_JURISDICTION = new Map<SupportedJurisdiction, JurisdictionSourcePolicy>(
  JURISDICTION_SOURCE_POLICIES.map((policy) => [policy.jurisdiction, policy])
);

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function isValidSubdomainOf(hostname: string, domain: string): boolean {
  return hostname.endsWith(`.${domain}`);
}

function isHostnameAllowedForDomain(hostname: string, domain: string): boolean {
  const normalizedHostname = normalizeHostname(hostname);
  const normalizedDomain = normalizeHostname(domain);

  if (!normalizedHostname || !normalizedDomain) {
    return false;
  }

  return (
    normalizedHostname === normalizedDomain ||
    isValidSubdomainOf(normalizedHostname, normalizedDomain)
  );
}

export function getJurisdictionSourcePolicy(
  jurisdiction: SupportedJurisdiction
): JurisdictionSourcePolicy | undefined {
  return POLICY_BY_JURISDICTION.get(jurisdiction);
}

export function getEnabledSourcesForJurisdiction(
  jurisdiction: SupportedJurisdiction
): LegalSourcePolicyEntry[] {
  const policy = getJurisdictionSourcePolicy(jurisdiction);

  if (!policy) {
    return [];
  }

  return policy.sources.filter((source) => source.enabled);
}

export function isAllowedLegalSourceDomain(
  jurisdiction: SupportedJurisdiction,
  hostname: string
): boolean {
  const enabledSources = getEnabledSourcesForJurisdiction(jurisdiction);

  if (enabledSources.length === 0) {
    return false;
  }

  return enabledSources.some((source) =>
    isHostnameAllowedForDomain(hostname, source.domain)
  );
}
