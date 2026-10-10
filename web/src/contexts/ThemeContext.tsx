import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system' | 'cat' | 'cat-dark';
export type FontFamily = 'system' | 'serif' | 'mono';
export type FontScale = 'small' | 'medium' | 'large';

interface ThemeContextType {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const updateThemeAppAssets = (theme: ThemeMode, isDark: boolean) => {
  const isCatTheme = theme === 'cat' || theme === 'cat-dark';
  const appearance = isDark ? 'dark' : 'light';
  const baseUrl = import.meta.env.BASE_URL;
  const icon = isCatTheme ? `app-icons/warm-kitty-${appearance}.svg` : 'favicon.png';
  const touchIcon = isCatTheme ? `app-icons/warm-kitty-${appearance}-192.png` : 'pwa-192x192.png';
  const manifest = isCatTheme
    ? `manifest-warm-kitty-${appearance}.webmanifest`
    : 'manifest.webmanifest';
  const themeColor = isCatTheme ? (isDark ? '#211b26' : '#fff9f4') : '#10b981';

  const setLink = (rel: string, href: string, type?: string) => {
    let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = `${baseUrl}${href}`;
    if (type) link.type = type;
  };

  setLink('icon', icon, isCatTheme ? 'image/svg+xml' : 'image/png');
  setLink('apple-touch-icon', touchIcon, 'image/png');
  setLink('manifest', manifest, 'application/manifest+json');

  let themeColorMeta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.content = themeColor;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' || saved === 'cat' || saved === 'cat-dark'
      ? saved
      : 'system';
  });

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('fontFamily') as FontFamily;
    return saved || 'system';
  });

  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    const saved = localStorage.getItem('fontScale') as FontScale;
    return saved || 'medium';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateEffectiveTheme = () => {
      let isDark = false;

      if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = theme === 'dark' || theme === 'cat-dark';
      }

      setEffectiveTheme(isDark ? 'dark' : 'light');

      // Apply theme to document
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.classList.toggle('theme-cat', theme === 'cat' || theme === 'cat-dark');
      document.documentElement.classList.toggle('theme-cat-dark', theme === 'cat-dark');
      updateThemeAppAssets(theme, isDark);
    };

    updateEffectiveTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        updateEffectiveTheme();
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Apply Font Settings
  useEffect(() => {
    const root = document.documentElement;
    
    // Font Family
    if (fontFamily === 'serif') {
      root.style.setProperty('--font-family-base', 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif');
    } else if (fontFamily === 'mono') {
      root.style.setProperty('--font-family-base', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace');
    } else {
      root.style.removeProperty('--font-family-base');
    }

    // Font Scale
    if (fontScale === 'small') {
      root.style.fontSize = '14px';
    } else if (fontScale === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }
  }, [fontFamily, fontScale]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setFontFamily = (newFont: FontFamily) => {
    setFontFamilyState(newFont);
    localStorage.setItem('fontFamily', newFont);
  };

  const setFontScale = (newScale: FontScale) => {
    setFontScaleState(newScale);
    localStorage.setItem('fontScale', newScale);
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const value: ThemeContextType = {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
    fontFamily,
    setFontFamily,
    fontScale,
    setFontScale,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
