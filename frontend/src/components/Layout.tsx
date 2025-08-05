import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import { LogOut, CreditCard, Menu, Grid3X3, FolderOpen, Settings, ChevronLeft, ChevronRight, Target, Users, User, Sun, Moon, ChevronDown } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { state, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navigation = [
    { path: '/dashboard', name: 'Dashboard', icon: Grid3X3 },
    { path: '/transactions', name: 'Operations', icon: FolderOpen },
    { path: '/accounts', name: 'Accounts & Statements', icon: CreditCard },
    { path: '/goals', name: 'Goals', icon: Target },
    { path: '/social', name: 'Social Finance', icon: Users },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Skip to main content link for screen readers */}
      <a 
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 btn btn-primary px-4 py-2 rounded-md z-50 focus:z-[60]"
      >
        Skip to main content
      </a>
      
      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed inset-y-0 left-0 z-50 ${
        sidebarMinimized ? 'w-20' : 'w-72'
      } bg-white dark:bg-secondary-800 shadow-2xl transition-all duration-300 ease-in-out flex flex-col`} aria-label="Sidebar navigation">
        
        {/* Logo */}
        <div className={`flex items-center ${sidebarMinimized ? 'px-4 justify-center' : 'px-8'} py-7 border-b border-secondary-200 dark:border-secondary-700 relative`}>
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl p-3 mr-3 shadow-md">
              <CreditCard className="h-7 w-7" />
            </div>
            {!sidebarMinimized && (
              <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">BUDGETON</h1>
            )}
          </div>
          
          {/* Theme Toggle - Always visible */}
          <button
            onClick={toggleTheme}
            className={`absolute top-1/2 -translate-y-1/2 ${
              sidebarMinimized ? 'right-12' : 'right-12'
            } btn btn-ghost`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          
          {/* Minimize Button - Only show on desktop */}
          <button
            onClick={() => setSidebarMinimized(!sidebarMinimized)}
            className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 ${
              sidebarMinimized ? 'right-3' : 'right-5'
            } btn btn-ghost`}
            aria-label={sidebarMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
            aria-expanded={!sidebarMinimized}
          >
            {sidebarMinimized ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center ${
                  sidebarMinimized ? 'px-3 py-3 justify-center' : 'px-5 py-3'
                } text-base font-medium rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? 'nav-item-active'
                    : 'nav-item'
                }`}
                title={sidebarMinimized ? item.name : undefined}
              >
                <Icon className={`${
                  sidebarMinimized ? '' : 'mr-4'
                } h-6 w-6 transition-colors ${
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-500 dark:text-secondary-400 group-hover:text-secondary-700 dark:group-hover:text-secondary-300'
                }`} />
                {!sidebarMinimized && item.name}
                
                {/* Tooltip for minimized state */}
                {sidebarMinimized && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-secondary-100 border border-secondary-200 dark:border-secondary-700 text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                    {item.name}
                    <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 border-8 border-transparent border-r-gray-200 dark:border-r-gray-700"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-secondary-200 dark:border-secondary-700 border-t p-4">
          {sidebarMinimized ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="bg-secondary-100 dark:bg-secondary-700 rounded-full h-10 w-10 flex items-center justify-center group relative hover:hover:bg-secondary-100 dark:hover:bg-secondary-600 transition-colors"
                  aria-label="Profile menu"
                >
                  <span className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                    {state.user?.full_name?.charAt(0) || state.user?.email?.charAt(0) || 'U'}
                  </span>
                </button>
                
                {/* Profile Dropdown - Minimized */}
                {profileDropdownOpen && (
                  <div className="absolute left-full ml-4 bottom-0 bg-white dark:bg-secondary-700 theme-border border rounded-lg shadow-xl py-2 w-48 z-50">
                    <div className="px-4 py-2 border-secondary-200 dark:border-secondary-700 border-b">
                      <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                        {state.user?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">{state.user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-full flex items-center justify-between hover:hover:bg-secondary-100 dark:hover:bg-secondary-600 p-2 rounded-lg transition-colors"
                aria-label="Profile menu"
              >
                <div className="flex items-center">
                  <div className="bg-secondary-100 dark:bg-secondary-700 rounded-full h-10 w-10 flex items-center justify-center">
                    <span className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                      {state.user?.full_name?.charAt(0) || state.user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <p className="text-base font-medium text-secondary-900 dark:text-secondary-100 truncate">
                      {state.user?.full_name || 'User'}
                    </p>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate">{state.user?.email}</p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-secondary-500 dark:text-secondary-400 transition-transform duration-200 ${
                  profileDropdownOpen ? 'rotate-180' : ''
                }`} />
              </button>
              
              {/* Profile Dropdown - Expanded */}
              {profileDropdownOpen && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-secondary-700 theme-border border rounded-lg shadow-xl py-2 z-50">
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <div className="border-secondary-200 dark:border-secondary-700 border-t my-1"></div>
                  <button
                    onClick={() => {
                      logout();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-secondary-600 dark:text-secondary-400 hover:hover:bg-secondary-100 dark:hover:bg-secondary-600 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
        sidebarMinimized ? 'lg:ml-20' : 'lg:ml-72'
      }`}>
        {/* Mobile header */}
        <div className="lg:hidden bg-white dark:bg-secondary-800 shadow-sm border-secondary-200 dark:border-secondary-700 border-b px-5 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn btn-ghost"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100">BUDGETON</h1>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>

        {/* Page content */}
        <main id="main-content" className="flex-1 p-6 lg:p-8 overflow-y-auto main-content">
          {children}
        </main>
      </div>
    </div>
  );
};