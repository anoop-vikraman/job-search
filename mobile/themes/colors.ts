// Backwards-compatible colour map sourced from @tweak/theme (light theme).
// Prefer `useTheme()` from themes/ThemeProvider for light/dark-aware colours;
// this static map exists for non-reactive call sites and legacy imports.
import { lightColors, palette } from '@tweak/theme';

export const themeColors = {
    primary: lightColors.primary,
    secondary: '#5856D6',
    background: lightColors.background,
    text: lightColors.text,
    textSecondary: lightColors.textSecondary,
    lightGray: lightColors.surfaceMuted,
    danger: lightColors.dangerFg,
    success: lightColors.successFg,
    warning: lightColors.pendingFg,
    border: lightColors.border,
    surface: lightColors.surface,
    surfaceMuted: lightColors.surfaceMuted,
    textMuted: lightColors.textMuted,
};

// Re-export the raw palette for cases that need a specific shade.
export { palette };
