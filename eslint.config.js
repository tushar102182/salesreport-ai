// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'apps/web/public/**', '**/*.db', 'docs/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['apps/server/**/*.ts', 'packages/shared/**/*.ts', '**/*.mjs', '*.js', '*.cjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    files: ['apps/server/src/types.d.ts'],
    rules: { '@typescript-eslint/no-namespace': 'off' },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Context providers co-located with their hooks.
    files: ['apps/web/src/lib/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['apps/web/public/theme-init.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  prettier,
);
