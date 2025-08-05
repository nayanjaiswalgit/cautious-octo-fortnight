import React, { useState, useEffect } from "react";
import {
  Plus,
  Mail,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { apiClient } from "../api/client";
import { LoadingSpinner } from "./LoadingSpinner";
import Modal from "./Modal";
import { Button } from "./Button";
import { Toast } from "./Toast";

interface GmailAccount {
  id: number;
  email_address: string;
  display_name: string;
  status: "active" | "inactive" | "auth_expired" | "error";
  sync_frequency: "manual" | "hourly" | "daily" | "weekly";
  last_sync_at: string | null;
  search_query: string;
  date_range_days: number;
  total_emails_processed: number;
  transactions_extracted: number;
  last_error_message: string;
  default_account: number | null;
  needs_reauth: boolean;
  is_ready_for_sync: boolean;
  created_at: string;
  updated_at: string;
}

interface Account {
  id: number;
  name: string;
  account_type: string;
  balance: number;
}

interface ExtractedTransaction {
  id: number;
  email_subject: string;
  email_sender: string;
  email_sender_domain: string;
  parsed_amount: number;
  currency: string;
  description: string;
  confidence_level: "high" | "medium" | "low";
  confidence_score: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  days_since_extracted: number;
}

const GmailAccounts: React.FC = () => {
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [extractedTransactions, setExtractedTransactions] = useState<
    ExtractedTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<GmailAccount | null>(
    null
  );
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>(
    []
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gmailResponse, accountsResponse, transactionsResponse] =
        await Promise.all([
          apiClient.get("/gmail-accounts/"),
          apiClient.get("/accounts/"),
          apiClient.get("/extracted-transactions/?status=pending"),
        ]);

      setGmailAccounts(Array.isArray(gmailResponse.data) ? gmailResponse.data : []);
      setAccounts(Array.isArray(accountsResponse.data) ? accountsResponse.data : []);
      setExtractedTransactions(Array.isArray(transactionsResponse.data) ? transactionsResponse.data : []);
    } catch (error) {
      console.error("Error loading data:", error);
      setToast({ message: "Error loading Gmail accounts", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGmailAccount = async () => {
    try {
      const response = await apiClient.get("/gmail-accounts/auth_url/");
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error("Error getting auth URL:", error);
      setToast({
        message: "Error starting Gmail authentication",
        type: "error",
      });
    }
  };

  const handleSyncAccount = async (accountId: number) => {
    try {
      await apiClient.post(`/gmail-accounts/${accountId}/sync/`);
      setToast({ message: "Gmail sync started", type: "success" });
      loadData(); // Refresh data
    } catch (error) {
      console.error("Error syncing account:", error);
      setToast({ message: "Error starting sync", type: "error" });
    }
  };

  const handleReauth = async (accountId: number) => {
    try {
      const response = await apiClient.post(
        `/gmail-accounts/${accountId}/reauth/`
      );
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error("Error getting reauth URL:", error);
      setToast({ message: "Error starting re-authentication", type: "error" });
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (
      !confirm(
        "Are you sure you want to remove this Gmail account? This will not delete your existing transactions."
      )
    ) {
      return;
    }

    try {
      await apiClient.delete(`/gmail-accounts/${accountId}/`);
      setToast({ message: "Gmail account removed", type: "success" });
      loadData();
    } catch (error) {
      console.error("Error deleting account:", error);
      setToast({ message: "Error removing Gmail account", type: "error" });
    }
  };

  const handleUpdateConfig = async (
    accountId: number,
    config: Partial<GmailAccount>
  ) => {
    try {
      await apiClient.patch(`/gmail-accounts/${accountId}/`, config);
      setToast({ message: "Configuration updated", type: "success" });
      setShowConfigModal(false);
      loadData();
    } catch (error) {
      console.error("Error updating config:", error);
      setToast({ message: "Error updating configuration", type: "error" });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedTransactions.length === 0) return;

    try {
      await apiClient.post("/extracted-transactions/actions/", {
        action: "bulk_approve",
        transaction_ids: selectedTransactions,
      });
      setToast({
        message: `Approved ${selectedTransactions.length} transactions`,
        type: "success",
      });
      setSelectedTransactions([]);
      loadData();
    } catch (error) {
      console.error("Error approving transactions:", error);
      setToast({ message: "Error approving transactions", type: "error" });
    }
  };

  const handleBulkReject = async () => {
    if (selectedTransactions.length === 0) return;

    try {
      await apiClient.post("/extracted-transactions/actions/", {
        action: "bulk_reject",
        transaction_ids: selectedTransactions,
      });
      setToast({
        message: `Rejected ${selectedTransactions.length} transactions`,
        type: "success",
      });
      setSelectedTransactions([]);
      loadData();
    } catch (error) {
      console.error("Error rejecting transactions:", error);
      setToast({ message: "Error rejecting transactions", type: "error" });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "inactive":
        return <Clock className="w-5 h-5 text-gray-500" />;
      case "auth_expired":
        return <XCircle className="w-5 h-5 text-orange-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          id="gmail-toast"
          title={toast.type === "success" ? "Success" : toast.type === "error" ? "Error" : "Info"}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gmail Integration
          </h1>
          <p className="text-gray-600">
            Automatically sync transactions from your Gmail accounts
          </p>
        </div>
        <Button
          onClick={handleAddGmailAccount}
        >
          <Plus className="w-4 h-4" />
          Add Gmail Account
        </Button>
      </div>

      {/* Gmail Accounts */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Connected Gmail Accounts
          </h2>
        </div>
        <div className="p-6">
          {gmailAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Gmail accounts connected
              </h3>
              <p className="text-gray-600 mb-4">
                Connect your Gmail account to automatically sync transactions
                from emails
              </p>
              <Button
                onClick={handleAddGmailAccount}
              >
                Connect Gmail Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {gmailAccounts.map((account) => (
                <div
                  key={account.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(account.status)}
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {account.email_address}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {account.total_emails_processed} emails processed •{" "}
                          {account.transactions_extracted} transactions
                          extracted
                        </p>
                        {account.last_sync_at && (
                          <p className="text-xs text-gray-500">
                            Last sync:{" "}
                            {new Date(account.last_sync_at).toLocaleString()}
                          </p>
                        )}
                        {account.last_error_message && (
                          <p className="text-xs text-red-600 mt-1">
                            {account.last_error_message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.needs_reauth ? (
                        <Button
                          onClick={() => handleReauth(account.id)}
                          size="sm"
                          variant="secondary"
                        >
                          Re-authenticate
                        </Button>
                      ) : account.is_ready_for_sync ? (
                        <Button
                          onClick={() => handleSyncAccount(account.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Sync Now
                        </Button>
                      ) : null}
                      <Button
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowConfigModal(true);
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteAccount(account.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Transactions */}
      {extractedTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Transactions ({extractedTransactions.length})
              </h2>
              {selectedTransactions.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkApprove}
                    size="sm"
                    variant="success"
                  >
                    Approve ({selectedTransactions.length})
                  </Button>
                  <Button
                    onClick={handleBulkReject}
                    size="sm"
                    variant="danger"
                  >
                    Reject ({selectedTransactions.length})
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {extractedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTransactions([
                            ...selectedTransactions,
                            transaction.id,
                          ]);
                        } else {
                          setSelectedTransactions(
                            selectedTransactions.filter(
                              (id) => id !== transaction.id
                            )
                          );
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {transaction.description}
                          </h4>
                          <p className="text-sm text-gray-600">
                            From: {transaction.email_sender_domain} • Amount:{" "}
                            {transaction.currency} {transaction.parsed_amount} •
                            {transaction.days_since_extracted} days ago
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {transaction.email_subject}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(
                              transaction.confidence_level
                            )}`}
                          >
                            {transaction.confidence_level} (
                            {Math.round(transaction.confidence_score * 100)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && selectedAccount && (
        <ConfigModal
          account={selectedAccount}
          accounts={accounts}
          onClose={() => setShowConfigModal(false)}
          onSave={(config) => handleUpdateConfig(selectedAccount.id, config)}
        />
      )}
    </div>
  );
};

// Configuration Modal Component
const ConfigModal: React.FC<{
  account: GmailAccount;
  accounts: Account[];
  onClose: () => void;
  onSave: (config: Partial<GmailAccount>) => void;
}> = ({ account, accounts, onClose, onSave }) => {
  const [displayName, setDisplayName] = useState(account.display_name);
  const [syncFrequency, setSyncFrequency] = useState(account.sync_frequency);
  const [searchQuery, setSearchQuery] = useState(account.search_query);
  const [dateRangeDays, setDateRangeDays] = useState(account.date_range_days);
  const [defaultAccount, setDefaultAccount] = useState(account.default_account);

  const handleSave = () => {
    onSave({
      display_name: displayName,
      sync_frequency: syncFrequency,
      search_query: searchQuery,
      date_range_days: dateRangeDays,
      default_account: defaultAccount,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Configure ${account.email_address}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sync Frequency
          </label>
          <select
            value={syncFrequency}
            onChange={(e) => setSyncFrequency(e.target.value as GmailAccount["sync_frequency"]) }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="manual">Manual Only</option>
            <option value="hourly">Every Hour</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Account
          </label>
          <select
            value={defaultAccount || ""}
            onChange={(e) =>
              setDefaultAccount(
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select an account...</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Search Query
          </label>
          <textarea
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="from:(bank OR paypal OR stripe)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Gmail search query to filter transaction emails
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range (days)
          </label>
          <input
            type="number"
            value={dateRangeDays}
            onChange={(e) => setDateRangeDays(parseInt(e.target.value))}
            min="1"
            max="365"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of past days to search for emails
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GmailAccounts;
