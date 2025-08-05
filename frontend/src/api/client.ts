import axios, { type AxiosInstance } from 'axios';
import type { 
  User, 
  Account, 
  Category, 
  Transaction, 
  TransactionSplit, 
  Goal,
  MerchantPattern,
  TransactionLink,
  Summary,
  Filter,
  Contact,
  GroupExpense,
  LendingTransaction
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token and CSRF protection
    this.client.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add CSRF token for state-changing operations
      if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
          config.headers['X-CSRFToken'] = csrfToken;
        }
      }
      
      return config;
    });

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            await this.refreshToken();
            // Retry the original request
            const originalRequest = error.config;
            const token = this.getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.logout();
            // Let the auth context handle the redirect to login
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private getCSRFToken(): string | null {
    // Get CSRF token from cookie or meta tag
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
    
    if (cookieValue) return cookieValue;
    
    // Fallback to meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    return metaTag?.content || null;
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  // Authentication
  async login(email: string, password: string): Promise<{ user: User; access: string; refresh: string }> {
    const response = await this.client.post('/auth/login/', { email, password });
    const { user, access, refresh } = response.data;
    this.setTokens(access, refresh);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  }

  async register(email: string, username: string, password: string, full_name: string): Promise<{ user: User; access: string; refresh: string }> {
    const response = await this.client.post('/auth/register/', {
      email,
      username,
      password,
      password_confirm: password,
      full_name,
    });
    const { user, access, refresh } = response.data;
    this.setTokens(access, refresh);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  }

  async getGoogleAuthUrl(): Promise<{ auth_url: string }> {
    const response = await this.client.get('/auth/google_auth_url/');
    return response.data;
  }

  async googleLogin(code: string, state: string): Promise<{ user: User; access: string; refresh: string; created: boolean }> {
    const response = await this.client.post('/auth/google_login/', { code, state });
    const { user, access, refresh } = response.data;
    this.setTokens(access, refresh);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  }

  async refreshToken(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
      refresh: refreshToken,
    });
    
    const { access } = response.data;
    localStorage.setItem('access_token', access);
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await this.client.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  // Users
  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/users/me/');
    return response.data;
  }

  async updateUserPreferences(preferences: {
    preferred_currency?: string;
    preferred_date_format?: string;
    enable_notifications?: boolean;
    full_name?: string;
  } | FormData): Promise<User> {
    const headers = preferences instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await this.client.patch('/users/update_preferences/', preferences, { headers });
    return response.data;
  }

  // Accounts
  async getAccounts(): Promise<Account[]> {
    const response = await this.client.get('/accounts/');
    return response.data.results || response.data;
  }

  async createAccount(account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Account> {
    const response = await this.client.post('/accounts/', account);
    return response.data;
  }

  async updateAccount(id: number, account: Partial<Account>): Promise<Account> {
    const response = await this.client.patch(`/accounts/${id}/`, account);
    return response.data;
  }

  async deleteAccount(id: number): Promise<void> {
    await this.client.delete(`/accounts/${id}/`);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const response = await this.client.get('/categories/');
    return response.data.results || response.data;
  }

  async createCategory(category: Omit<Category, 'id' | 'user_id' | 'created_at'>): Promise<Category> {
    const response = await this.client.post('/categories/', category);
    return response.data;
  }

  async updateCategory(id: number, category: Partial<Category>): Promise<Category> {
    const response = await this.client.patch(`/categories/${id}/`, category);
    return response.data;
  }

  async deleteCategory(id: number): Promise<void> {
    await this.client.delete(`/categories/${id}/`);
  }

  // Goals
  async getGoals(): Promise<Goal[]> {
    const response = await this.client.get('/goals/');
    return response.data.results || response.data;
  }

  async createGoal(goal: Omit<Goal, 'id' | 'progress_percentage' | 'remaining_amount' | 'is_completed' | 'created_at' | 'updated_at'>): Promise<Goal> {
    const response = await this.client.post('/goals/', goal);
    return response.data;
  }

  async updateGoal(id: number, goal: Partial<Goal>): Promise<Goal> {
    const response = await this.client.patch(`/goals/${id}/`, goal);
    return response.data;
  }

  async deleteGoal(id: number): Promise<void> {
    await this.client.delete(`/goals/${id}/`);
  }

  async updateGoalProgress(id: number, amount: number): Promise<Goal> {
    const response = await this.client.post(`/goals/${id}/update_progress/`, { amount });
    return response.data;
  }

  async toggleGoalStatus(id: number, status: 'active' | 'paused' | 'cancelled'): Promise<Goal> {
    const response = await this.client.post(`/goals/${id}/toggle_status/`, { status });
    return response.data;
  }

  // Merchant Patterns
  async getMerchantPatterns(): Promise<MerchantPattern[]> {
    const response = await this.client.get('/merchant-patterns/');
    return response.data.results || response.data;
  }

  async createMerchantPattern(pattern: Omit<MerchantPattern, 'id' | 'created_at' | 'last_used' | 'usage_count' | 'category_name'>): Promise<MerchantPattern> {
    const response = await this.client.post('/merchant-patterns/', pattern);
    return response.data;
  }

  async updateMerchantPattern(id: number, pattern: Partial<MerchantPattern>): Promise<MerchantPattern> {
    const response = await this.client.patch(`/merchant-patterns/${id}/`, pattern);
    return response.data;
  }

  async deleteMerchantPattern(id: number): Promise<void> {
    await this.client.delete(`/merchant-patterns/${id}/`);
  }

  // Transaction Links
  async getTransactionLinks(): Promise<TransactionLink[]> {
    const response = await this.client.get('/transaction-links/');
    return response.data.results || response.data;
  }

  async confirmTransactionLink(id: number): Promise<TransactionLink> {
    const response = await this.client.post(`/transaction-links/${id}/confirm/`);
    return response.data;
  }

  // Transactions
  async getTransactions(filters?: Partial<Filter>): Promise<{ results: Transaction[]; count: number }> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await this.client.get(`/transactions/?${params.toString()}`);
    return response.data;
  }

  async getTransaction(id: number): Promise<Transaction> {
    const response = await this.client.get(`/transactions/${id}/`);
    return response.data;
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    const response = await this.client.post('/transactions/', transaction);
    return response.data;
  }

  async updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction> {
    const response = await this.client.patch(`/transactions/${id}/`, transaction);
    return response.data;
  }

  async deleteTransaction(id: number): Promise<void> {
    await this.client.delete(`/transactions/${id}/`);
  }

  async updateTransactionSplits(id: number, splits: TransactionSplit[]): Promise<Transaction> {
    const response = await this.client.post(`/transactions/${id}/split/`, { splits });
    return response.data;
  }

  async bulkUpdateTransactionAccount(transactionIds: number[], accountId: number): Promise<{ updated_count: number; account_name: string }> {
    const response = await this.client.post('/transactions/bulk_update_account/', {
      transaction_ids: transactionIds,
      account_id: accountId
    });
    return response.data;
  }

  async bulkUpdateTransactions(transactionIds: number[], updates: {
    accountId?: number;
    categoryId?: string;
    tags?: string[];
    verified?: boolean;
  }): Promise<{ updated_count: number }> {
    const data: any = { transaction_ids: transactionIds };
    
    if (updates.accountId !== undefined) data.account_id = updates.accountId;
    if (updates.categoryId !== undefined) data.category_id = updates.categoryId;
    if (updates.tags !== undefined) data.tags = updates.tags;
    if (updates.verified !== undefined) data.verified = updates.verified;

    const response = await this.client.post('/transactions/bulk_update/', data);
    return response.data;
  }

  async suggestTransactionLinks(id: number): Promise<{ suggestions: any[] }> {
    const response = await this.client.get(`/transactions/${id}/suggest_links/`);
    return response.data;
  }

  async autoCategorizTransaction(id: number): Promise<Transaction> {
    const response = await this.client.post(`/transactions/${id}/auto_categorize/`);
    return response.data;
  }

  async acceptSuggestedCategory(id: number): Promise<Transaction> {
    const response = await this.client.post(`/transactions/${id}/accept_suggestion/`);
    return response.data;
  }

  async getTransactionSummary(filters?: Partial<Filter>): Promise<Summary> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await this.client.get(`/transactions/summary/?${params.toString()}`);
    return response.data;
  }

  // Upload
  async uploadFile(file: File, password?: string, accountId?: number): Promise<{ session_id: number; status: string; total_transactions: number }> {
    const formData = new FormData();
    formData.append('file', file);
    if (password) {
      formData.append('password', password);
    }
    if (accountId) {
      formData.append('account_id', accountId.toString());
    }
    
    const response = await this.client.post('/upload/upload_statement/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  async getCsvFormat(): Promise<any> {
    const response = await this.client.get('/upload/csv_format/');
    return response.data;
  }

  async getJsonFormat(): Promise<any> {
    const response = await this.client.get('/upload/json_format/');
    return response.data;
  }

  async getUploadSessions(): Promise<any[]> {
    const response = await this.client.get('/upload/sessions/');
    return response.data.sessions || [];
  }

  async getUploadStatus(sessionId: number): Promise<any> {
    const response = await this.client.get(`/upload/${sessionId}/status/`);
    return response.data;
  }

  async updateUploadSession(sessionId: number, data: { filename?: string }): Promise<any> {
    const response = await this.client.patch(`/upload/${sessionId}/`, data);
    return response.data;
  }

  async deleteUploadSession(sessionId: number): Promise<void> {
    await this.client.delete(`/upload/${sessionId}/`);
  }

  // OCR Receipt Processing
  async processReceipt(receiptImage: File, accountId?: number): Promise<{
    success: boolean;
    ocr_result: {
      merchant_name?: string;
      amount?: string;
      date?: string;
      items: string[];
      suggested_category?: string;
      confidence: number;
      ai_analysis?: string;
      raw_text: string;
    };
    suggestions: {
      create_transaction: boolean;
      account_id?: number;
      account_name?: string;
    };
  }> {
    const formData = new FormData();
    formData.append('receipt_image', receiptImage);
    if (accountId) {
      formData.append('account_id', accountId.toString());
    }

    const response = await this.client.post('/upload/process_receipt/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async createTransactionFromReceipt(data: {
    merchant_name: string;
    amount: number | string;
    date: string;
    account_id: number;
    category_name?: string;
    items?: string[];
    notes?: string;
  }): Promise<{
    success: boolean;
    transaction_id: number;
    message: string;
  }> {
    const response = await this.client.post('/upload/create_transaction_from_receipt/', data);
    return response.data;
  }

  // Contacts API
  async getContacts(): Promise<Contact[]> {
    const response = await this.client.get('/contacts/');
    return response.data.results || response.data;
  }

  async createContact(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const response = await this.client.post('/contacts/', data);
    return response.data;
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    const response = await this.client.patch(`/contacts/${id}/`, data);
    return response.data;
  }

  async deleteContact(id: number): Promise<void> {
    await this.client.delete(`/contacts/${id}/`);
  }

  // Group Expenses API
  async getGroupExpenses(): Promise<GroupExpense[]> {
    const response = await this.client.get('/group-expenses/');
    return response.data.results || response.data;
  }

  async createGroupExpense(data: Omit<GroupExpense, 'id' | 'created_at' | 'updated_at' | 'shares' | 'account_name' | 'paid_by_name' | 'total_settled_amount' | 'is_fully_settled'>): Promise<GroupExpense> {
    const response = await this.client.post('/group-expenses/', data);
    return response.data;
  }

  async updateGroupExpense(id: number, data: Partial<GroupExpense>): Promise<GroupExpense> {
    const response = await this.client.patch(`/group-expenses/${id}/`, data);
    return response.data;
  }

  async deleteGroupExpense(id: number): Promise<void> {
    await this.client.delete(`/group-expenses/${id}/`);
  }

  async addGroupExpenseParticipant(expenseId: number, participantId: number, shareAmount: string): Promise<any> {
    const response = await this.client.post(`/group-expenses/${expenseId}/add_participant/`, {
      participant_id: participantId,
      share_amount: shareAmount
    });
    return response.data;
  }

  async recordGroupExpensePayment(expenseId: number, shareId: number, amount: string, notes?: string): Promise<GroupExpense> {
    const response = await this.client.post(`/group-expenses/${expenseId}/record_payment/`, {
      share_id: shareId,
      amount: amount,
      notes: notes
    });
    return response.data;
  }

  async getGroupExpenseBalances(expenseId: number): Promise<any> {
    const response = await this.client.get(`/group-expenses/${expenseId}/balances/`);
    return response.data;
  }

  // Lending Transactions API
  async getLendingTransactions(): Promise<LendingTransaction[]> {
    const response = await this.client.get('/lending-transactions/');
    return response.data.results || response.data;
  }

  async createLendingTransaction(data: Omit<LendingTransaction, 'id' | 'created_at' | 'updated_at' | 'repayments' | 'contact_name' | 'account_name' | 'remaining_amount' | 'is_fully_repaid' | 'repayment_percentage'>): Promise<LendingTransaction> {
    const response = await this.client.post('/lending-transactions/', data);
    return response.data;
  }

  async updateLendingTransaction(id: number, data: Partial<LendingTransaction>): Promise<LendingTransaction> {
    const response = await this.client.patch(`/lending-transactions/${id}/`, data);
    return response.data;
  }

  async deleteLendingTransaction(id: number): Promise<void> {
    await this.client.delete(`/lending-transactions/${id}/`);
  }

  async recordLendingRepayment(lendingId: number, amount: string, date?: string, notes?: string): Promise<LendingTransaction> {
    const response = await this.client.post(`/lending-transactions/${lendingId}/record_repayment/`, {
      amount: amount,
      date: date,
      notes: notes
    });
    return response.data;
  }

  async writeOffLendingTransaction(lendingId: number): Promise<LendingTransaction> {
    const response = await this.client.post(`/lending-transactions/${lendingId}/write_off/`);
    return response.data;
  }

  async getLendingSummary(): Promise<any> {
    const response = await this.client.get('/lending-transactions/summary/');
    return response.data;
  }

  // OCR Invoice Processing
  async processInvoice(file: File): Promise<{
    raw_text: string;
    merchant_name?: string;
    amount?: number;
    date?: string;
    items?: string[];
    confidence?: number;
    suggested_category?: string;
    error?: string;
  }> {
    const formData = new FormData();
    formData.append('invoice', file);
    
    const response = await this.client.post('/transactions/process_receipt/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  // Export transactions
  async exportTransactions(
    format: 'csv' | 'json' | 'excel' | 'pdf',
    transactionIds?: number[],
    filters?: Partial<Filter>
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (transactionIds && transactionIds.length > 0) {
      params.append('transaction_ids', transactionIds.join(','));
    }
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const response = await this.client.get(`/transactions/export/?${params.toString()}`, {
      responseType: 'blob',
    });
    
    return response.data;
  }

  // Subscriptions
  async getSubscriptions(): Promise<any[]> {
    const response = await this.client.get('/subscriptions/');
    return response.data.results || response.data;
  }

  async createSubscription(subscription: any): Promise<any> {
    const response = await this.client.post('/subscriptions/', subscription);
    return response.data;
  }

  async updateSubscription(id: number, subscription: Partial<any>): Promise<any> {
    const response = await this.client.patch(`/subscriptions/${id}/`, subscription);
    return response.data;
  }

  async deleteSubscription(id: number): Promise<void> {
    await this.client.delete(`/subscriptions/${id}/`);
  }

  async detectSubscriptions(lookbackDays: number = 365): Promise<any> {
    const response = await this.client.post('/subscriptions/detect_subscriptions/', {
      lookback_days: lookbackDays
    });
    return response.data;
  }

  async createSubscriptionFromDetection(detectionData: any): Promise<any> {
    const response = await this.client.post('/subscriptions/create_from_detection/', {
      detection_data: detectionData
    });
    return response.data;
  }

  async getSubscriptionSummary(): Promise<any> {
    const response = await this.client.get('/subscriptions/summary/');
    return response.data;
  }

  async getUpcomingRenewals(days: number = 7): Promise<any[]> {
    const response = await this.client.get(`/subscriptions/upcoming_renewals/?days=${days}`);
    return response.data;
  }

  async getMissedPayments(graceDays: number = 5): Promise<any[]> {
    const response = await this.client.get(`/subscriptions/missed_payments/?grace_days=${graceDays}`);
    return response.data;
  }

  async pauseSubscription(id: number): Promise<any> {
    const response = await this.client.post(`/subscriptions/${id}/pause/`);
    return response.data;
  }

  async resumeSubscription(id: number): Promise<any> {
    const response = await this.client.post(`/subscriptions/${id}/resume/`);
    return response.data;
  }

  async cancelSubscription(id: number): Promise<any> {
    const response = await this.client.post(`/subscriptions/${id}/cancel/`);
    return response.data;
  }

  // Processing Rules
  async getProcessingRules(): Promise<any[]> {
    const response = await this.client.get('/processing-rules/');
    return response.data.results || response.data;
  }

  async createProcessingRule(rule: any): Promise<any> {
    const response = await this.client.post('/processing-rules/', rule);
    return response.data;
  }

  async updateProcessingRule(id: number, rule: Partial<any>): Promise<any> {
    const response = await this.client.patch(`/processing-rules/${id}/`, rule);
    return response.data;
  }

  async deleteProcessingRule(id: number): Promise<void> {
    await this.client.delete(`/processing-rules/${id}/`);
  }

  async getProcessingRuleChoices(): Promise<any> {
    const response = await this.client.get('/processing-rules/choices/');
    return response.data;
  }

  async testProcessingRule(id: number): Promise<any> {
    const response = await this.client.post(`/processing-rules/${id}/test_rule/`);
    return response.data;
  }

  async applyProcessingRuleToExisting(id: number): Promise<any> {
    const response = await this.client.post(`/processing-rules/${id}/apply_to_existing/`);
    return response.data;
  }

  async reorderProcessingRules(ruleIds: number[]): Promise<any> {
    const response = await this.client.post('/processing-rules/reorder/', { rule_ids: ruleIds });
    return response.data;
  }

  // Gmail Integration
  async getGmailAccounts(): Promise<any[]> {
    const response = await this.client.get('/gmail-accounts/');
    return response.data.results || response.data;
  }

  async getGmailAuthUrl(): Promise<{ auth_url: string }> {
    const response = await this.client.get('/gmail-accounts/auth_url/');
    return response.data;
  }

  async handleGmailOAuthCallback(code: string, state: string): Promise<any> {
    const response = await this.client.post('/gmail-accounts/oauth_callback/', { code, state });
    return response.data;
  }

  async updateGmailAccount(id: number, data: any): Promise<any> {
    const response = await this.client.patch(`/gmail-accounts/${id}/`, data);
    return response.data;
  }

  async deleteGmailAccount(id: number): Promise<void> {
    await this.client.delete(`/gmail-accounts/${id}/`);
  }

  async syncGmailAccount(id: number): Promise<any> {
    const response = await this.client.post(`/gmail-accounts/${id}/sync/`);
    return response.data;
  }

  async reauthGmailAccount(id: number): Promise<{ auth_url: string }> {
    const response = await this.client.post(`/gmail-accounts/${id}/reauth/`);
    return response.data;
  }

  async getGmailSyncLogs(accountId: number): Promise<any[]> {
    const response = await this.client.get(`/gmail-accounts/${accountId}/sync_logs/`);
    return response.data;
  }

  // Email Templates
  async getEmailTemplates(): Promise<any[]> {
    const response = await this.client.get('/email-templates/');
    return response.data.results || response.data;
  }

  async createEmailTemplate(template: any): Promise<any> {
    const response = await this.client.post('/email-templates/', template);
    return response.data;
  }

  async updateEmailTemplate(id: number, template: any): Promise<any> {
    const response = await this.client.patch(`/email-templates/${id}/`, template);
    return response.data;
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    await this.client.delete(`/email-templates/${id}/`);
  }

  async getCommonEmailPatterns(): Promise<any> {
    const response = await this.client.get('/email-templates/common_patterns/');
    return response.data;
  }

  // Extracted Transactions
  async getExtractedTransactions(params?: any): Promise<any[]> {
    const response = await this.client.get('/extracted-transactions/', { params });
    return response.data.results || response.data;
  }

  async getExtractedTransactionsSummary(): Promise<any> {
    const response = await this.client.get('/extracted-transactions/summary/');
    return response.data;
  }

  async performTransactionActions(action: string, data: any): Promise<any> {
    const response = await this.client.post('/extracted-transactions/actions/', {
      action,
      ...data
    });
    return response.data;
  }

  async approveExtractedTransaction(id: number, data?: any): Promise<any> {
    const response = await this.client.post(`/extracted-transactions/${id}/approve/`, data || {});
    return response.data;
  }

  async rejectExtractedTransaction(id: number, data?: any): Promise<any> {
    const response = await this.client.post(`/extracted-transactions/${id}/reject/`, data || {});
    return response.data;
  }

  // Gmail Sync Operations
  async startGmailSync(data?: any): Promise<any> {
    const response = await this.client.post('/gmail-sync/start/', data || {});
    return response.data;
  }

  async getGmailSyncStatus(): Promise<any[]> {
    const response = await this.client.get('/gmail-sync/status/');
    return response.data;
  }

  // Generic HTTP methods for direct API access
  async get(url: string, config?: any): Promise<any> {
    const response = await this.client.get(url, config);
    return response;
  }

  async post(url: string, data?: any, config?: any): Promise<any> {
    const response = await this.client.post(url, data, config);
    return response;
  }

  async patch(url: string, data?: any, config?: any): Promise<any> {
    const response = await this.client.patch(url, data, config);
    return response;
  }

  async delete(url: string, config?: any): Promise<any> {
    const response = await this.client.delete(url, config);
    return response;
  }

  // Data Import/Export/User Management
  async importTransactions(formData: FormData, importType: string): Promise<any> {
    const response = await this.client.post(`/transactions/import/?format=${importType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteUserAccount(): Promise<void> {
    await this.client.delete('/auth/user/');
  }

  async changePassword(data: { current_password: string; new_password: string }): Promise<void> {
    await this.client.post('/auth/change-password/', data);
  }
}

export const apiClient = new ApiClient();