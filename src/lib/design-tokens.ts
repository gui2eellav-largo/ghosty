/**
 * Design System Tokens
 * Cohérence globale inspirée de Wispr Flow
 */

export const designTokens = {
  // Spacing cohérent
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },

  // Border radius
  radius: {
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Typography
  fontSize: {
    xs: '0.625rem',   // 10px
    sm: '0.75rem',    // 12px
    base: '0.875rem', // 14px
    md: '0.9375rem',  // 15px
    lg: '1rem',       // 16px
    xl: '1.125rem',   // 18px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Colors - Neutral palette
  colors: {
    // Backgrounds
    bg: {
      primary: 'hsl(0 0% 100%)',
      primaryDark: '#0c0c0c',
      secondary: 'hsl(240 4.8% 95.9%)',
      secondaryDark: '#141414',
      tertiary: 'hsl(0 0% 98%)',
      tertiaryDark: '#1a1a1a',
    },
    
    // Text (light mode secondary/tertiary at 22% lightness for WCAG AA ≥4.5:1 on white)
    text: {
      primary: 'hsl(240 10% 3.9%)',
      primaryDark: 'hsl(0 0% 98%)',
      secondary: 'hsl(240 4% 22%)',
      secondaryDark: 'hsl(240 5% 70%)',
      tertiary: 'hsl(240 4% 22%)',
      tertiaryDark: 'hsl(240 4% 50%)',
    },

    // Borders
    border: {
      default: 'hsl(240 5.9% 90%)',
      defaultDark: '#222',
      subtle: 'rgba(0, 0, 0, 0.06)',
      subtleDark: 'rgba(255, 255, 255, 0.06)',
    },

    // Interactive
    accent: {
      primary: '#10b981',     // Green
      primaryHover: '#059669',
      danger: '#ef4444',
      dangerHover: '#dc2626',
    },
  },

  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },

  // Transitions
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Floating widget (pill + menu)
  floatingWidget: {
    pillSize: 24,
    expandedWidth: 86,
    menuWidth: 280,
    menuHeight: 240,
    bouncePadding: 6,
    closeDurationMs: 650,
    leaveDelayMs: 120,
    openDurationMs: 500,
    openEasing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    closeEasing: 'cubic-bezier(0.33, 1, 0.68, 1)',
    /** Distance from window left to pill right when menu is open (wrapper centered in content area). */
    menuPillRightOffset: 191,
    /** Distance from window left to dot center when idle (anchor). pillSize/2 + bouncePadding */
    dotOffsetIdle: 20,
    /** Distance from window left to dot center when expanded (anchor). expandedWidth + bouncePadding - 8 */
    dotOffsetExpanded: 100,
    /** Distance from window left to dot center when menu open (anchor). menuPillRightOffset - 8 */
    dotOffsetMenu: 183,
  },
} as const;

// Utility classes cohérentes (Notion-like, Vercel, less is more)
export const uiClasses = {
  // Page structure (all views)
  pageTitle: 'text-2xl font-semibold tracking-tight text-black/90 dark:text-white/90',
  pageDescription: 'text-sm text-muted-foreground mt-1',
  pageHeaderMargin: 'mb-8',
  sectionLabel: 'text-[10px] font-medium uppercase tracking-wider text-muted-foreground',
  pageCard: 'rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03]',
  infoBox: 'rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]',
  emptyStateTitle: 'text-sm font-medium text-muted-foreground uppercase tracking-widest',
  emptyStateIcon: 'text-muted-foreground/40',
  bodyText: 'text-sm text-muted-foreground',
  bodyTextPrimary: 'text-sm text-black dark:text-white',

  // Modal
  modalOverlay: 'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4',
  modalContainer: 'bg-white dark:bg-[#0c0c0c] rounded-lg shadow-md w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col',
  modalHeader: 'px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]',
  modalBody: 'flex-1 flex flex-col min-h-0 overflow-hidden',
  
  // Sections (minimal : pas de bordure, padding réduit)
  sectionHeader: 'mb-3',
  sectionTitle: 'text-lg font-semibold text-black dark:text-white',
  sectionDescription: 'text-xs text-muted-foreground mt-0.5',
  sectionMinimal: 'py-4',
  
  // Cards
  card: 'bg-black/[0.02] dark:bg-white/[0.02] rounded-lg',
  cardCompact: 'bg-black/[0.02] dark:bg-white/[0.02] rounded-lg',
  cardMinimal: 'bg-black/[0.02] dark:bg-white/[0.02]',
  
  // Navigation
  navItem: 'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
  navItemActive: 'bg-black/5 dark:bg-white/5 text-black dark:text-white',
  navItemInactive: 'text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.02]',
  
  // Inputs
  input: 'w-full px-3 py-2.5 rounded-lg bg-transparent border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-sm transition-all',
  select: 'w-full px-3 py-2.5 rounded-lg bg-transparent border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-sm transition-all',
  
  // Buttons
  buttonPrimary: 'px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold text-sm hover:opacity-80 transition-opacity',
  buttonSecondary: 'px-4 py-2.5 bg-black/5 dark:bg-white/5 text-black dark:text-white rounded-lg font-semibold text-sm hover:bg-black/10 dark:hover:bg-white/10 transition-all',
  buttonDanger: 'px-4 py-2.5 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors',
  buttonGhost: 'text-muted-foreground hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors rounded',
  
  // Toggle
  toggle: 'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20',
  toggleActive: 'bg-green-500',
  toggleInactive: 'bg-black/10 dark:bg-white/10',
  toggleThumb: 'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
} as const;
