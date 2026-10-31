// CommonJS mirror of the semantic light-theme tokens for Tailwind/NativeWind
// config consumption (Tailwind config runs in Node and cannot import the .ts source).
// Keep in sync with src/tokens.ts (lightColors + spacing/radii/fontSize).
const palette = {
    brand500: '#01C39D',
    brand600: '#00A884',
    slate50: '#F8FAFC',
    slate100: '#F1F5F9',
    slate200: '#E2E8F0',
    slate400: '#94A3B8',
    slate500: '#64748B',
    slate900: '#0F172A',
    slate950: '#020617',
    white: '#FFFFFF',
    green600: '#16A34A',
    green100: '#DCFCE7',
    red600: '#DC2626',
    red100: '#FEE2E2',
    amber600: '#D97706',
    amber100: '#FEF3C7',
};

module.exports = {
    colors: {
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
    },
    spacing: { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 },
    borderRadius: { sm: 8, md: 12, lg: 16, xl: 24 },
    fontSize: { caption: 12, body: 16, h3: 20, h2: 24, h1: 32 },
};
