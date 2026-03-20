export interface CreateDPUInput {
  domain: string;
  purpose: string;
  final_action: string;
  evidence_level?: string;
  reviewed_by?: string;
  reviewer_role?: string;
  approved?: boolean;
  second_reviewer_id?: string;
  second_approved?: boolean;
  tags?: string[];
  reference_type?: string;
  reference_id?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface VerifyProofResponse {
  success: boolean;
  verified: boolean;
  proof: unknown;
  errors?: string[];
}

export interface ChainVerifyOptions {
  fromIndex?: number;
  toIndex?: number;
  batchSize?: number;
}

export class CronozenApiClient {
  constructor(
    private baseUrl: string,
    private bearerToken: string,
  ) {}

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(
        `API ${method} ${path} failed (${response.status}): ${
          errorBody?.error || response.statusText
        }`,
      );
    }

    return response.json() as Promise<T>;
  }

  async createDPU(input: CreateDPUInput): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/api/dpu/demo', input);
  }

  async verifyProof(
    proofId: string,
    data?: Record<string, unknown>,
  ): Promise<VerifyProofResponse> {
    return this.request<VerifyProofResponse>('POST', '/api/proof/verify', {
      proofId,
      data,
    });
  }

  async verifyChain(
    domain: string,
    options?: ChainVerifyOptions,
  ): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/api/dpu/verify-chain', {
      domain,
      ...options,
    });
  }

  async getDPU(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('GET', `/api/dpu/${encodeURIComponent(id)}`);
  }

  async exportDPUJsonLD(id: string): Promise<unknown> {
    return this.request<unknown>(
      'GET',
      `/api/dpu/${encodeURIComponent(id)}/export?format=jsonld`,
    );
  }

  async publicVerifyDPU(id: string): Promise<PublicVerifyResponse> {
    return this.request<PublicVerifyResponse>(
      'GET',
      `/api/dpu/${encodeURIComponent(id)}/verify`,
    );
  }
}

export interface PublicVerifyResponse {
  success: boolean;
  verified: boolean;
  proof: {
    id: string;
    decision_id: string;
    domain: string;
    chain_index: number;
    evidence_level: string;
    audit_status: string;
    created_at: string;
  };
  integrity: {
    hash_valid: boolean;
    previous_link_valid: boolean | null;
    next_link_valid: boolean | null;
    algorithm: string;
    chain_hash: string;
  };
}
