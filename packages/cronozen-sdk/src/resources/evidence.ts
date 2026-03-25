import type { HttpClient } from '../client';
import type { EvidenceResponse, EvidenceExportResponse } from '../types';

export class EvidenceResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get sealed evidence for a decision event.
   *
   * Returns the full evidence record including event details,
   * approval info, and hash chain position.
   *
   * @throws NotFoundError if the decision has not been sealed yet.
   */
  async get(id: string): Promise<EvidenceResponse> {
    const response = await this.http.request<{ data: EvidenceResponse }>(
      'GET',
      `/evidence/${encodeURIComponent(id)}`,
    );
    return response.data;
  }

  /**
   * Export evidence as a verifiable JSON document.
   *
   * Returns a JSON-LD structured document with verification metadata,
   * suitable for archival or external audit.
   */
  async export(id: string): Promise<EvidenceExportResponse> {
    return this.http.request<EvidenceExportResponse>(
      'GET',
      `/evidence/${encodeURIComponent(id)}/export`,
    );
  }
}
