import {
    darkColors,
    lightColors,
    radii,
    spacing,
    ThemeColors,
    ThemeName,
} from '@tweak/theme';
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeContextValue {
    name: ThemeName;
    colors: ThemeColors;
    spacing: typeof spacing;
    radii: typeof radii;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';

    const value = useMemo<ThemeContextValue>(
        () => ({
            name: isDark ? 'dark' : 'light',
            colors: isDark ? darkColors : lightColors,
            spacing,
            radii,
            isDark,
        }),
        [isDark]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Read the active theme (colours, spacing, radii). */
export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return ctx;
}
