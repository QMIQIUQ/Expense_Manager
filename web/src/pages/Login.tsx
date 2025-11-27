import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  // Close language menu on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!showLangMenu) return;
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showLangMenu]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(t('loginFailed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div 
          className="relative backdrop-blur rounded-2xl border p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
            boxShadow: '0 8px 32px var(--shadow-lg)'
          }}
        >
          {/* Language menu */}
          <div className="absolute top-4 right-4" ref={langMenuRef}>
            <button
              onClick={() => setShowLangMenu((s) => !s)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-haspopup="menu"
              aria-expanded={showLangMenu}
              aria-label="Select language"
            >
              🌐 {language === 'en' ? 'English' : language === 'zh' ? '繁體中文' : '简体中文'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showLangMenu && (
              <div 
                role="menu" 
                className="absolute right-0 mt-2 w-40 rounded-lg border py-1 z-10"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  boxShadow: '0 4px 12px var(--shadow-md)'
                }}
              >
                <button
                  role="menuitem"
                  onClick={() => { setLanguage('en'); setShowLangMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm transition-colors"
                  style={{
                    backgroundColor: language === 'en' ? 'var(--accent-light)' : 'transparent',
                    color: language === 'en' ? 'var(--accent-primary)' : 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    if (language !== 'en') e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (language !== 'en') e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  English
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setLanguage('zh'); setShowLangMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm transition-colors"
                  style={{
                    backgroundColor: language === 'zh' ? 'var(--accent-light)' : 'transparent',
                    color: language === 'zh' ? 'var(--accent-primary)' : 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    if (language !== 'zh') e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (language !== 'zh') e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  繁體中文
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setLanguage('zh-CN'); setShowLangMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm transition-colors"
                  style={{
                    backgroundColor: language === 'zh-CN' ? 'var(--accent-light)' : 'transparent',
                    color: language === 'zh-CN' ? 'var(--accent-primary)' : 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    if (language !== 'zh-CN') e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    if (language !== 'zh-CN') e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  简体中文
                </button>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {t('appTitle')}
              </h1>
              <h2 className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('login')}
              </h2>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div 
              className="mb-4 rounded-md border text-sm px-3 py-2"
              style={{
                backgroundColor: 'var(--error-bg)',
                borderColor: 'var(--error-border)',
                color: 'var(--error-text)'
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('email')}
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => e.target.select()}
                required
                className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 transition-colors"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required
                  className="w-full rounded-md border px-3 py-2 pr-10 focus:outline-none focus:ring-2 transition-colors"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)'
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M10.58 6.11A9.77 9.77 0 0112 6c5 0 9.27 3.11 10.5 7-.36 1.15-1 2.2-1.86 3.1M7.1 7.1C4.8 8.45 3.2 10.5 2.5 13c.5 1.62 1.53 3.08 2.93 4.23C7.55 18.87 9.7 20 12 20c.9 0 1.77-.12 2.6-.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md text-white font-medium px-4 py-2.5 focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              style={{
                backgroundColor: 'var(--accent-primary)',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(124, 58, 237, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.25)';
              }}
            >
              {loading && (
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z" fill="#fff" opacity=".25"/>
                  <path d="M12 2a10 10 0 00-10 10h2a8 8 0 018-8V2z" fill="#fff"/>
                </svg>
              )}
              {loading ? t('loading') : t('login')}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
          © {new Date().getFullYear()} Expense Manager
        </p>
      </div>
    </div>
  );
};

export default Login;
