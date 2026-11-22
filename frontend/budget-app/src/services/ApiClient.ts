import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  BudgetRequest,
  BudgetResponse,
  CategoryRequest,
  CategoryResponse,
  TransactionRequest,
  TransactionResponse,
  TransactionBatchRequest,
  TransactionBatchResponse,
  FinancialSummary,
  MetadataResponse,
  MetadataUpdateRequest,
} from '../types/api';

// Use relative path for proxy, full URL for production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('authToken');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Budget endpoints
  async getBudgets(userId: string): Promise<BudgetResponse[]> {
    return this.request<BudgetResponse[]>(`/budgets?userId=${userId}`);
  }

  async getBudget(id: string): Promise<BudgetResponse> {
    return this.request<BudgetResponse>(`/budgets/${id}`);
  }

  async createBudget(data: BudgetRequest): Promise<BudgetResponse> {
    return this.request<BudgetResponse>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBudget(id: string, data: BudgetRequest): Promise<BudgetResponse> {
    return this.request<BudgetResponse>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(id: string): Promise<void> {
    return this.request<void>(`/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  // Category endpoints
  async getCategories(userId: string): Promise<CategoryResponse[]> {
    return this.request<CategoryResponse[]>(`/categories?userId=${userId}`);
  }

  async createCategory(data: CategoryRequest): Promise<CategoryResponse> {
    return this.request<CategoryResponse>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Transaction endpoints
  async getTransactions(
    userId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      category?: string;
    }
  ): Promise<TransactionResponse[]> {
    const params = new URLSearchParams({ userId });
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.category) params.append('category', filters.category);

    return this.request<TransactionResponse[]>(`/transactions?${params}`);
  }

  async getTransaction(id: string): Promise<TransactionResponse> {
    return this.request<TransactionResponse>(`/transactions/${id}`);
  }

  async createTransaction(data: TransactionRequest): Promise<TransactionResponse> {
    return this.request<TransactionResponse>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(
    id: string,
    data: TransactionRequest
  ): Promise<TransactionResponse> {
    return this.request<TransactionResponse>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.request<void>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Batch import endpoint
  async batchImportTransactions(data: TransactionBatchRequest): Promise<TransactionBatchResponse> {
    return this.request<TransactionBatchResponse>('/transactions/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Report endpoints
  async getFinancialSummary(userId: string): Promise<FinancialSummary> {
    return this.request<FinancialSummary>(`/reports/summary?userId=${userId}`);
  }

  // Metadata endpoints
  async getUserMetadata(userId: string): Promise<MetadataResponse> {
    return this.request<MetadataResponse>(`/users/${userId}/metadata`);
  }

  async updateUserMetadata(userId: string, data: MetadataUpdateRequest): Promise<MetadataResponse> {
    return this.request<MetadataResponse>(`/users/${userId}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();