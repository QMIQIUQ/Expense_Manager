/**
 * Theme Configuration
 * Central theme system for the application
 * Uses design tokens for consistency
 */

import { designTokens } from './designTokens';

export const theme = {
  // Component-specific styles
  components: {
    button: {
      primary: {
        backgroundColor: designTokens.colors.primary[500],
        color: designTokens.colors.text.inverse,
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[4]}`,
        borderRadius: designTokens.borderRadius.md,
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.medium,
        transition: designTokens.transitions.base,
        hoverBackgroundColor: designTokens.colors.primary[600],
      },
      secondary: {
        backgroundColor: designTokens.colors.gray[100],
        color: designTokens.colors.text.primary,
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[4]}`,
        borderRadius: designTokens.borderRadius.md,
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.medium,
        transition: designTokens.transitions.base,
        hoverBackgroundColor: designTokens.colors.gray[200],
      },
      danger: {
        backgroundColor: designTokens.colors.error.main,
        color: designTokens.colors.text.inverse,
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[4]}`,
        borderRadius: designTokens.borderRadius.md,
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.medium,
        transition: designTokens.transitions.base,
        hoverBackgroundColor: designTokens.colors.error.dark,
      },
      success: {
        backgroundColor: designTokens.colors.success.main,
        color: designTokens.colors.text.inverse,
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[4]}`,
        borderRadius: designTokens.borderRadius.md,
        fontSize: designTokens.typography.fontSize.base,
        fontWeight: designTokens.typography.fontWeight.medium,
        transition: designTokens.transitions.base,
        hoverBackgroundColor: designTokens.colors.success.dark,
      },
    },
    input: {
      base: {
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
        borderRadius: designTokens.borderRadius.md,
        borderWidth: '1px',
        borderColor: designTokens.colors.border.main,
        fontSize: designTokens.typography.fontSize.base,
        backgroundColor: designTokens.colors.background.primary,
        focusBorderColor: designTokens.colors.primary[500],
        focusRing: `0 0 0 3px ${designTokens.colors.primary[100]}`,
        transition: designTokens.transitions.base,
      },
      error: {
        borderColor: designTokens.colors.error.main,
        focusRing: `0 0 0 3px ${designTokens.colors.error.light}`,
      },
    },
    select: {
      base: {
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
        borderRadius: designTokens.borderRadius.md,
        borderWidth: '1px',
        borderColor: designTokens.colors.border.main,
        fontSize: designTokens.typography.fontSize.base,
        backgroundColor: designTokens.colors.background.primary,
        focusBorderColor: designTokens.colors.primary[500],
        transition: designTokens.transitions.base,
      },
    },
    card: {
      base: {
        backgroundColor: designTokens.colors.background.primary,
        borderRadius: designTokens.borderRadius.lg,
        padding: designTokens.spacing[6],
        boxShadow: designTokens.shadows.base,
        border: `1px solid ${designTokens.colors.border.light}`,
      },
      hover: {
        boxShadow: designTokens.shadows.md,
        transition: designTokens.transitions.base,
      },
    },
    modal: {
      overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: designTokens.zIndex.modal,
      },
      content: {
        backgroundColor: designTokens.colors.background.primary,
        borderRadius: designTokens.borderRadius.xl,
        padding: designTokens.spacing[6],
        maxWidth: '32rem',
        boxShadow: designTokens.shadows.xl,
      },
    },
    dropdown: {
      base: {
        backgroundColor: designTokens.colors.background.primary,
        borderRadius: designTokens.borderRadius.md,
        boxShadow: designTokens.shadows.lg,
        border: `1px solid ${designTokens.colors.border.light}`,
        padding: designTokens.spacing[2],
        zIndex: designTokens.zIndex.dropdown,
      },
      item: {
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
        borderRadius: designTokens.borderRadius.base,
        cursor: 'pointer',
        transition: designTokens.transitions.fast,
        hoverBackgroundColor: designTokens.colors.gray[100],
        activeBackgroundColor: designTokens.colors.primary[50],
      },
    },
    badge: {
      success: {
        backgroundColor: designTokens.colors.success.light,
        color: designTokens.colors.success.dark,
        padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
        borderRadius: designTokens.borderRadius.full,
        fontSize: designTokens.typography.fontSize.xs,
        fontWeight: designTokens.typography.fontWeight.medium,
      },
      warning: {
        backgroundColor: designTokens.colors.warning.light,
        color: designTokens.colors.warning.dark,
        padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
        borderRadius: designTokens.borderRadius.full,
        fontSize: designTokens.typography.fontSize.xs,
        fontWeight: designTokens.typography.fontWeight.medium,
      },
      error: {
        backgroundColor: designTokens.colors.error.light,
        color: designTokens.colors.error.dark,
        padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
        borderRadius: designTokens.borderRadius.full,
        fontSize: designTokens.typography.fontSize.xs,
        fontWeight: designTokens.typography.fontWeight.medium,
      },
      info: {
        backgroundColor: designTokens.colors.info.light,
        color: designTokens.colors.info.dark,
        padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
        borderRadius: designTokens.borderRadius.full,
        fontSize: designTokens.typography.fontSize.xs,
        fontWeight: designTokens.typography.fontWeight.medium,
      },
    },
    tooltip: {
      base: {
        backgroundColor: designTokens.colors.gray[900],
        color: designTokens.colors.text.inverse,
        padding: `${designTokens.spacing[2]} ${designTokens.spacing[3]}`,
        borderRadius: designTokens.borderRadius.md,
        fontSize: designTokens.typography.fontSize.sm,
        zIndex: designTokens.zIndex.tooltip,
        boxShadow: designTokens.shadows.lg,
      },
    },
  },

  // Layout
  layout: {
    container: {
      maxWidth: '1280px',
      padding: designTokens.spacing[4],
    },
    sidebar: {
      width: '16rem',
      backgroundColor: designTokens.colors.background.secondary,
    },
    header: {
      height: '4rem',
      backgroundColor: designTokens.colors.background.primary,
      borderBottom: `1px solid ${designTokens.colors.border.light}`,
    },
  },

  // Utility classes mapping
  utilities: {
    text: {
      primary: { color: designTokens.colors.text.primary },
      secondary: { color: designTokens.colors.text.secondary },
      tertiary: { color: designTokens.colors.text.tertiary },
      inverse: { color: designTokens.colors.text.inverse },
    },
    bg: {
      primary: { backgroundColor: designTokens.colors.background.primary },
      secondary: { backgroundColor: designTokens.colors.background.secondary },
      tertiary: { backgroundColor: designTokens.colors.background.tertiary },
    },
  },
} as const;

export default theme;

// Helper to get component styles
export const getComponentStyles = (component: string, variant = 'base') => {
  const componentKey = component as keyof typeof theme.components;
  if (theme.components[componentKey]) {
    const comp = theme.components[componentKey];
    if (typeof comp === 'object' && variant in comp) {
      return comp[variant as keyof typeof comp];
    }
    return comp;
  }
  return {};
};
