import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Loader2, Eye, EyeOff, Sun, Moon, CheckCircle, BarChart3, Users } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { state, login, register, googleLogin, clearError } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if user is already logged in
  useEffect(() => {
    if (state.user && !state.isLoading) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [state.user, state.isLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!email || !password || (isRegister && (!username || !fullName))) {
      return;
    }

    let result;
    if (isRegister) {
      result = await register(email, username, password, fullName);
    } else {
      result = await login(email, password);
    }

    // Navigate to dashboard on successful login/register
    if (result.success) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    await googleLogin();
  };

  return (
    <div className="min-h-screen flex overflow-hidden gradient-bg">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 btn btn-secondary rounded-full p-3 shadow-soft hover:shadow-md animate-fade-in"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-50 via-primary-100 to-secondary-100 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 -left-10 w-72 h-72 bg-primary-200/20 dark:bg-primary-500/10 rounded-full blur-3xl animate-bounce-soft"></div>
          <div className="absolute -bottom-20 right-0 w-96 h-96 bg-secondary-200/15 dark:bg-secondary-500/10 rounded-full blur-3xl animate-bounce-soft" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-primary-300/20 dark:bg-primary-600/10 rounded-full blur-2xl animate-bounce-soft" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center p-8 w-full h-full text-secondary-800 dark:text-secondary-100 animate-slide-up">
          {/* Logo and Brand */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-3xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-soft-lg animate-scale-in">
              <Mail className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-gradient">
              BUDGETON
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-300 max-w-md">
              Take control of your financial future with smart budgeting and expense tracking
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-success-100 dark:bg-success-900/30 border border-success-200 dark:border-success-700">
                <CheckCircle className="w-4 h-4 text-success-600 dark:text-success-400" />
              </div>
              <span className="text-sm font-medium">Multi-account tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700">
                <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="text-sm font-medium">Smart analytics & insights</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-warning-100 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-700">
                <Users className="w-4 h-4 text-warning-600 dark:text-warning-400" />
              </div>
              <span className="text-sm font-medium">Group expense sharing</span>
            </div>
          </div>

          {/* Stats Card */}
          <div className="glass p-6 rounded-2xl shadow-soft w-full max-w-sm animate-slide-up" style={{animationDelay: '0.3s'}}>
            <div className="text-center mb-4">
              <div className="text-sm mb-1 text-secondary-600 dark:text-secondary-300">Total Managed Funds</div>
              <div className="text-3xl font-bold text-gradient">$1.2M+</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-success-600 dark:text-success-400">15K+</div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">Active Users</div>
              </div>
              <div>
                <div className="text-xl font-bold text-primary-600 dark:text-primary-400">98%</div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-md animate-slide-up" style={{animationDelay: '0.2s'}}>
          {/* Logo for mobile */}
          <div className="lg:hidden text-center mb-6">
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-2xl p-3 w-12 h-12 flex items-center justify-center mx-auto mb-3 shadow-soft">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-gradient">BUDGETON</h1>
          </div>

          <div className="card shadow-soft-lg">
            <div className="card-body">
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
                  {isRegister ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400">
                  {isRegister 
                    ? 'Start your financial journey today' 
                    : 'Sign in to your account to continue'
                  }
                </p>
              </div>

              {/* Error Display */}
              {state.error && (
                <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg animate-slide-down">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-danger-600 dark:text-danger-400 mr-2" />
                    <span className="text-sm text-danger-700 dark:text-danger-300">{state.error}</span>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="form-label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input pl-10"
                      placeholder="Enter your email"
                      required
                      disabled={state.isLoading}
                    />
                  </div>
                </div>

                {/* Register fields */}
                {isRegister && (
                  <>
                    <div>
                      <label className="form-label">Username</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="form-input pl-10"
                          placeholder="Choose a username"
                          required
                          disabled={state.isLoading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="form-input pl-10"
                          placeholder="Enter your full name"
                          required
                          disabled={state.isLoading}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Password */}
                <div>
                  <label className="form-label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input pl-10 pr-10"
                      placeholder="Enter your password"
                      required
                      disabled={state.isLoading}
                      minLength={isRegister ? 6 : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"
                      disabled={state.isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={state.isLoading || !email || !password || (isRegister && (!username || !fullName))}
                  className="w-full btn btn-primary py-3 mt-6"
                >
                  {state.isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner w-4 h-4 mr-2"></div>
                      {isRegister ? 'Creating Account...' : 'Signing In...'}
                    </div>
                  ) : (
                    isRegister ? 'Create Account' : 'Sign In'
                  )}
                </button>

                {/* Google Login */}
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-secondary-200 dark:border-secondary-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-secondary-800 text-secondary-500">Or continue with</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={state.isLoading}
                    className="w-full btn btn-secondary mt-4 py-3"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                </div>

                {/* Toggle Form Type */}
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      clearError();
                    }}
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium transition-colors"
                    disabled={state.isLoading}
                  >
                    {isRegister 
                      ? 'Already have an account? Sign In' 
                      : "Don't have an account? Sign Up"
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};