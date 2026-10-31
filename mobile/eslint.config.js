// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
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
    },
  },
]);
