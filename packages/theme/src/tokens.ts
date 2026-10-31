// @tweak/theme — single source of design tokens for Tweak (mobile + admin).
// Tokens only, no logic. Colours are referenced via ThemeProvider/useTheme (mobile)
// and mapped to Tailwind CSS variables (admin). Never hard-code hex in components.

/** Raw palette (slate base + brand + status), shared by both themes. */
export const palette = {
    // Brand
    brand500: '#01C39D',
    brand600: '#00A884',
    brand700: '#008066',

    // Slate neutrals
    slate50: '#F8FAFC',
    slate100: '#F1F5F9',
    slate200: '#E2E8F0',
    slate300: '#CBD5E1',
    slate400: '#94A3B8',
    slate500: '#64748B',
    slate600: '#475569',
    slate700: '#334155',
    slate800: '#1E293B',
    slate900: '#0F172A',
    slate950: '#020617',

    // Gray neutrals (legacy usages map here)
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray700: '#374151',
    gray900: '#111827',

    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F9FAFB',
    gray600: '#4B5563',
    gray800: '#1F2937',

    // Status
    green600: '#16A34A',
    green700: '#15803D',
    green800: '#166534',
    green500: '#22C55E',
    green300: '#86EFAC',
    green100: '#DCFCE7',
    green50: '#F0FDF4',
    emerald100: '#D1FAE5',
    emerald50: '#ECFDF5',
    green950: '#052E16',
    red700: '#B91C1C',
    red600: '#DC2626',
    red500: '#EF4444',
    red300: '#FCA5A5',
    red200: '#FECACA',
    red100: '#FEE2E2',
    red50: '#FEF2F2',
    red950: '#450A0A',
    amber700: '#B45309',
    amber600: '#D97706',
    amber500: '#F59E0B',
    amber100: '#FEF3C7',
    amber950: '#451A03',

    // Legacy iOS system colours (pre-rebrand usages)
    iosBlue: '#007AFF',
    iosBlueStrong: '#005BB5',
    iosIndigo: '#5856D6',
    iosRed: '#FF3B30',

    // Accent hues (category tiles, decorative surfaces, promos)
    blue700: '#1D4ED8',
    blue800: '#1E40AF',
    blue600: '#2563EB',
    blue500: '#3B82F6',
    blue100: '#DBEAFE',
    blue200: '#BFDBFE',
    blue50: '#EFF6FF',
    sky700: '#0369A1',
    sky600: '#0284C7',
    sky50: '#F0F9FF',
    indigo600: '#4F46E5',
    indigo500: '#6366F1',
    indigo100: '#C7D2FE',
    indigo50: '#EEF2FF',
    indigo950: '#1E1B4B',
    violet700: '#6D28D9',
    violet600: '#7C3AED',
    violet900: '#5B21B6',
    violet100: '#EDE9FE',
    violet50: '#F5F3FF',
    purple600: '#9333EA',
    purple500: '#8B5CF6',
    orange700: '#9A3412',
    orange600: '#EA580C',
    orange500: '#F97316',
    orange200: '#FED7AA',
    orange100: '#FFEDD5',
    orange50: '#FFF7ED',
    pink500: '#EC4899',
    teal500: '#14B8A6',
    yellow500: '#EAB308',
    gold: '#FFD700',
    lime: '#96C41E',
} as const;

/** Spacing scale (pt). */
export const spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
} as const;

/** Border radii (pt). */
export const radii = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
} as const;

/** Type scale (pt). */
export const fontSize = {
    caption: 12,
    body: 16,
    h3: 20,
    h2: 24,
    h1: 32,
} as const;

/** Semantic colour roles resolved per theme. */
export interface ThemeColors {
    primary: string;
    primaryStrong: string;
    onPrimary: string;

    background: string;
    surface: string;
    surfaceMuted: string;
    border: string;

    text: string;
    textSecondary: string;
    textMuted: string;

    // Domain status (shared vocabulary with admin)
    successFg: string;
    successBg: string;
    dangerFg: string;
    dangerBg: string;
    pendingFg: string;
    pendingBg: string;
    neutralFg: string;
    neutralBg: string;
}

export const lightColors: ThemeColors = {
    primary: palette.brand500,
    primaryStrong: palette.brand600,
    onPrimary: palette.white,

    background: palette.white,
    surface: palette.white,
    surfaceMuted: palette.slate50,
    border: palette.slate200,

    text: palette.slate900,
    textSecondary: palette.slate500,
    textMuted: palette.slate400,

    successFg: palette.green600,
    successBg: palette.green100,
    dangerFg: palette.red600,
    dangerBg: palette.red100,
    pendingFg: palette.amber600,
    pendingBg: palette.amber100,
    neutralFg: palette.slate500,
    neutralBg: palette.slate100,
};

export const darkColors: ThemeColors = {
    primary: palette.brand500,
    primaryStrong: palette.brand600,
    onPrimary: palette.slate950,

    background: palette.slate950,
    surface: palette.slate900,
    surfaceMuted: palette.slate800,
    border: palette.slate700,

    text: palette.slate50,
    textSecondary: palette.slate400,
    textMuted: palette.slate500,

    successFg: palette.green600,
    successBg: palette.green950,
    dangerFg: palette.red600,
    dangerBg: palette.red950,
    pendingFg: palette.amber600,
    pendingBg: palette.amber950,
    neutralFg: palette.slate400,
    neutralBg: palette.slate800,
};

export type ThemeName = 'light' | 'dark';

export const themes: Record<ThemeName, ThemeColors> = {
    light: lightColors,
    dark: darkColors,
};
