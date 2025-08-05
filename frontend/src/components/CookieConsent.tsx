import React, { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';
import { Button } from './Button';

export const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
  };

  const rejectCookies = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setShowBanner(false);
    // Clear any existing cookies except essential ones
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      if (name.trim() !== 'sessionid' && name.trim() !== 'csrftoken') {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 transform transition-transform duration-500 ease-out translate-y-0">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Cookie className="h-8 w-8 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cookie Consent</h3>
              <p className="text-base text-gray-700 mb-4">
                We use essential cookies to ensure our website works properly and analytics cookies to understand how you interact with it. 
                You can accept all cookies or reject non-essential ones.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={acceptCookies}
                  size="lg"
                >
                  Accept All
                </Button>
                <Button
                  onClick={rejectCookies}
                  variant="secondary"
                  size="lg"
                >
                  Reject Non-Essential
                </Button>
                <a
                  href="/privacy-policy"
                  className="px-6 py-3 text-blue-600 text-base underline hover:text-blue-700 flex items-center"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
          <Button
            onClick={rejectCookies}
            variant="ghost"
            aria-label="Close cookie banner"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};