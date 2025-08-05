import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { LoadingSpinner } from "./LoadingSpinner";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "./Button";

const GmailCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage("Authorization was denied or an error occurred.");
        setTimeout(() => navigate("/gmail"), 3000);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Missing authorization code or state parameter.");
        setTimeout(() => navigate("/gmail"), 3000);
        return;
      }

      try {
        const result = await apiClient.handleGmailOAuthCallback(code, state);

        if (result.success) {
          setStatus("success");
          setMessage(
            `Successfully connected ${result.gmail_account.email_address}!`
          );
          setTimeout(() => navigate("/gmail"), 2000);
        } else {
          throw new Error(result.error || "Unknown error occurred");
        }
      } catch (error: unknown) {
        console.error("OAuth callback error:", error);
        setStatus("error");
        setMessage(
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            (error as Error)?.message ||
            "Failed to connect Gmail account"
        );
        setTimeout(() => navigate("/gmail"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <LoadingSpinner />
            <h2 className="text-xl font-semibold text-gray-900 mt-4">
              Connecting Gmail Account
            </h2>
            <p className="text-gray-600 mt-2">
              Please wait while we set up your Gmail integration...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900 mt-4">
              Success!
            </h2>
            <p className="text-gray-600 mt-2">{message}</p>
            <p className="text-sm text-gray-500 mt-4">
              Redirecting you back to Gmail settings...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900 mt-4">
              Connection Failed
            </h2>
            <p className="text-gray-600 mt-2">{message}</p>
            <p className="text-sm text-gray-500 mt-4">
              Redirecting you back to Gmail settings...
            </p>
            <Button
              onClick={() => navigate("/gmail")}
            >
              Go Back
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default GmailCallback;
