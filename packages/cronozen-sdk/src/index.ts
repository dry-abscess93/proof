import type { CronozenConfig } from './types';
import { HttpClient } from './client';
import { DecisionResource } from './resources/decision';
import { EvidenceResource } from './resources/evidence';

export class Cronozen {
  readonly decision: DecisionResource;
  readonly evidence: EvidenceResource;

  constructor(config: CronozenConfig) {
    const http = new HttpClient(config);
    this.decision = new DecisionResource(http);
    this.evidence = new EvidenceResource(http);
  }
}

// Re-export everything
export type {
  CronozenConfig,
  // Core objects
  DecisionActor,
  DecisionAction,
  AIContext,
  ApprovalActor,
  // Enums
  DecisionEventType,
  DecisionEventStatus,
  EvidenceStatus,
  ApprovalResult,
  ActorType,
  ApproverType,
  // Requests
  RecordDecisionRequest,
  ApproveDecisionRequest,
  ListDecisionOptions,
  // Responses
  DecisionEventResponse,
  DecisionEventListResponse,
  ApprovalResponse,
  EvidenceResponse,
  EvidenceExportResponse,
} from './types';

export {
  CronozenError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
  RateLimitError,
  TimeoutError,
  NetworkError,
} from './errors';
