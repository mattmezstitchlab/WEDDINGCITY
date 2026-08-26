export type SiteRequestStatus = 'nouvelle' | 'qualification' | 'devis' | 'acceptée' | 'archivée';

export interface SiteRequest {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  organisation: string;
  eventType: string;
  websiteNeed: string;
  budget: string;
  message: string;
  status: SiteRequestStatus;
}

const KEY = 'weddingcity_site_requests_v1';

export function siteRequests(): SiteRequest[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as SiteRequest[]; }
  catch { return []; }
}

export function createSiteRequest(input: Omit<SiteRequest, 'id' | 'createdAt' | 'status'>): SiteRequest {
  const request: SiteRequest = {
    ...input,
    id: `site_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: 'nouvelle',
  };
  localStorage.setItem(KEY, JSON.stringify([request, ...siteRequests()]));
  return request;
}

export function setSiteRequestStatus(id: string, status: SiteRequestStatus): void {
  localStorage.setItem(KEY, JSON.stringify(siteRequests().map((request) => request.id === id ? { ...request, status } : request)));
}
