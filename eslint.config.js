import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  /* `src/components/ui` is shadcn's generated code and `scripts` is dev tooling that
     never ships; neither is ours to keep lint-clean, and between them they produced
     26 of the 30 errors this config used to report. Lint what we write. */
  globalIgnores(['dist', 'src/components/ui/**', 'scripts/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      /* A hot-reload granularity hint, not a correctness rule. Our context files
         legitimately export a provider and its hook together (useTheme, modelContext),
         and Viz.tsx exports components beside the constants they are configured with.
         Splitting those to satisfy fast refresh would be churn for no reader. */
      'react-refresh/only-export-components': 'off',
    },
  },
])
