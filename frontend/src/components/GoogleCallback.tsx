import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('Google OAuth error:', error);
        navigate('/login', { 
          state: { error: 'Google authentication was cancelled or failed' } 
        });
        return;
      }

      if (!code || !state) {
        console.error('Missing OAuth parameters');
        navigate('/login', { 
          state: { error: 'Invalid OAuth response' } 
        });
        return;
      }

      try {
        const result = await handleGoogleCallback(code, state);
        if (result.success) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login', { 
            state: { error: result.error || 'Google login failed' } 
          });
        }
      } catch (error) {
        console.error('Google callback error:', error);
        navigate('/login', { 
          state: { error: 'Google login failed' } 
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, handleGoogleCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center theme-bg-primary">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 theme-text-primary" />
        <h2 className="text-xl font-semibold theme-text-primary mb-2">
          Completing Google Sign In
        </h2>
        <p className="theme-text-secondary">
          Please wait while we log you in...
        </p>
      </div>
    </div>
  );
};