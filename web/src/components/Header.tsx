import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/adminService';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  DocumentTextIcon,
  FolderIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onTabChange?: (tab: string) => void;
  onImportClick?: () => void;
  onExportClick?: () => void;
  onDownloadTemplateClick?: () => void;
  activeTab?: string;
}

const Header: React.FC<HeaderProps> = ({
  onTabChange,
  onImportClick,
  onExportClick,
  onDownloadTemplateClick,
  activeTab = 'dashboard',
}) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (currentUser) {
        const adminStatus = await adminService.isAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, [currentUser]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleNavigation = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    }
    setIsMobileMenuOpen(false);
  };

  // Only show header when user is logged in and on dashboard
  if (!currentUser || location.pathname !== '/dashboard') {
    return null;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'expenses', label: 'Expenses', icon: DocumentTextIcon },
    { id: 'categories', label: 'Categories', icon: FolderIcon },
    { id: 'budgets', label: 'Budgets', icon: CurrencyDollarIcon },
    { id: 'recurring', label: 'Recurring', icon: ArrowPathIcon },
  ];

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💰</span>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                Expense Manager
              </h1>
              <h1 className="text-lg font-bold text-gray-900 sm:hidden">
                Expense
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-label={item.label}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-2">
              {/* Import/Export Buttons */}
              <button
                onClick={onDownloadTemplateClick}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                aria-label="Download Template"
                title="Download Template"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              <button
                onClick={onExportClick}
                className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                aria-label="Export Excel"
                title="Export Excel"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              <button
                onClick={onImportClick}
                className="p-2 text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                aria-label="Import"
                title="Import"
              >
                <ArrowUpTrayIcon className="h-5 w-5" />
              </button>

              {/* Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Profile Menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  <UserCircleIcon className="h-6 w-6" />
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      {currentUser?.email}
                    </div>
                    <button
                      onClick={() => {
                        handleNavigation('profile');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <UserCircleIcon className="h-5 w-5" />
                      <span>Profile</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          handleNavigation('admin');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <ShieldCheckIcon className="h-5 w-5" />
                        <span>Admin</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            ref={mobileMenuRef}
            className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
          >
            <div className="p-6">
              {/* Close Button */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* User Info */}
              <div className="mb-6 pb-6 border-b">
                <div className="flex items-center space-x-3">
                  <UserCircleIcon className="h-10 w-10 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1 mb-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                        activeTab === item.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Import/Export Section */}
              <div className="mb-6 pb-6 border-b">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  Data Management
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      onDownloadTemplateClick?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-6 w-6" />
                    <span>Download Template</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportClick?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-6 w-6" />
                    <span>Export Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      onImportClick?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-3 text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                  >
                    <ArrowUpTrayIcon className="h-6 w-6" />
                    <span>Import</span>
                  </button>
                </div>
              </div>

              {/* Profile & Admin Links */}
              <div className="space-y-2 mb-6">
                <button
                  onClick={() => handleNavigation('profile')}
                  className={`w-full flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <UserCircleIcon className="h-6 w-6" />
                  <span>Profile</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleNavigation('admin')}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${
                      activeTab === 'admin'
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ShieldCheckIcon className="h-6 w-6" />
                    <span>Admin</span>
                  </button>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
