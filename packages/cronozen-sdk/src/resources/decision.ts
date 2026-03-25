import type { HttpClient } from '../client';
import type {
  RecordDecisionRequest,
  ApproveDecisionRequest,
  DecisionEventResponse,
  DecisionEventListResponse,
  ApprovalResponse,
  ListDecisionOptions,
} from '../types';

export class DecisionResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Record a new decision event.
   *
   * Creates a DRAFT evidence record linked to the proof hash chain.
   */
  async record(
    request: RecordDecisionRequest,
  ): Promise<DecisionEventResponse> {
    const response = await this.http.request<{ data: DecisionEventResponse }>(
      'POST',
      '/decision-events',
      { body: request },
    );
    return response.data;
  }

  /**
   * Approve or reject a decision event.
   *
   * If approved, the evidence is sealed with a SHA-256 chain hash
   * and the evidence level becomes AUDIT_READY.
   *
   * @throws ConflictError if the decision is already sealed.
   */
  async approve(
    id: string,
    request: ApproveDecisionRequest,
  ): Promise<ApprovalResponse> {
    const response = await this.http.request<{ data: ApprovalResponse }>(
      'POST',
      `/decision-events/${encodeURIComponent(id)}/approvals`,
      { body: request },
    );
    return response.data;
  }

  /**
   * Get a single decision event by ID or decisionId.
   */
  async get(id: string): Promise<DecisionEventResponse> {
    const response = await this.http.request<{ data: DecisionEventResponse }>(
      'GET',
      `/decision-events/${encodeURIComponent(id)}`,
    );
    return response.data;
  }

  /**
   * List decision events with optional filters.
   */
  async list(
    options?: ListDecisionOptions,
  ): Promise<DecisionEventListResponse> {
    return this.http.request<DecisionEventListResponse>(
      'GET',
      '/decision-events',
      {
        query: {
          limit: options?.limit,
          offset: options?.offset,
          type: options?.type,
          status: options?.status,
          tag: options?.tag,
        },
      },
    );
  }
}
