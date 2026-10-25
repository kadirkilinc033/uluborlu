export type ThreatLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RedirectHop {
  hopNumber: number;
  url: string;
  statusCode: number;
  location?: string;
  server?: string;
  responseTimeMs: number;
}

export interface HeuristicFinding {
  code: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  scoreImpact: number;
  description: string;
}

export interface DomainInfo {
  hostname: string;
  protocol: string;
  port: string;
  tld: string;
  subdomains: string[];
  entropy: number;
  isIpAddress: boolean;
  isPunycode: boolean;
  decodedPunycode?: string;
}

export interface PageContentInfo {
  title?: string;
  metaDescription?: string;
  contentType?: string;
  contentLength?: string;
  securityHeaders: {
    hsts: boolean;
    csp: boolean;
    xFrameOptions: string | null;
    xContentTypeOptions: string | null;
  };
}

export interface AiThreatIntel {
  threatLevel: ThreatLevel;
  riskScore: number;
  threatType: string;
  mitreTechnique: string;
  executiveSummary: string;
  keyRisks: string[];
  recommendedActions: string[];
}

export interface ScanReport {
  id: string;
  timestamp: string;
  input: string;
  targetUrl?: string;
  finalUrl: string;
  payloadType: 'URL' | 'WIFI' | 'VCARD' | 'SMS' | 'TEL' | 'MAILTO';
  source: 'manual' | 'camera' | 'upload' | 'batch' | 'sample';
  redirects: RedirectHop[];
  redirectError?: string;
  heuristics: {
    findings: HeuristicFinding[];
    heuristicRiskScore: number;
    domainInfo?: DomainInfo;
    matchedBrands?: string[];
  };
  pageContent: PageContentInfo | null;
  finalRiskScore: number;
  finalThreatLevel: ThreatLevel;
  aiIntel: AiThreatIntel;
}

export interface BatchItemResult {
  url: string;
  finalUrl: string;
  hopCount: number;
  riskScore: number;
  threatLevel: ThreatLevel;
  findingsCount: number;
  matchedBrands: string[];
  hostname: string;
  error?: string;
}
