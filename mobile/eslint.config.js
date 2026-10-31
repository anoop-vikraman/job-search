// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      // Literal apostrophes/quotes in user-facing copy are fine in React Native;
      // escaping them hurts readability of translation strings.
      'react/no-unescaped-entities': 'off',

      // React Compiler (SDK 58) advisory rules. Keep them visible as warnings
      // for incremental cleanup, but don't fail the build on pre-existing
      // effect/ref patterns. `rules-of-hooks` stays an error (crash risk).
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-render': 'warn',

      // Coding conventions (.kiro/steering/coding-conventions.md): no `any`,
      // explicit return types on exported functions/hooks/API clients.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
]);
