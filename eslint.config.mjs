import pluginJs from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import regexPlugin from 'eslint-plugin-regex';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import reactPlugin from 'eslint-plugin-react';
import reactHookPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.playwright/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.next/**',
      '**/*.d.ts',
      '**/*.js.map'
    ]
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true
      },
      globals: {
        ...globals.es2021,
        ...globals.jest,
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@stylistic/ts': stylistic,
      regex: regexPlugin,
      'unused-imports': unusedImportsPlugin
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@stylistic/ts/indent': ['error', 2, { SwitchCase: 1 }],
      '@stylistic/ts/block-spacing': ['error', 'always'],
      '@stylistic/ts/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/ts/linebreak-style': ['error', 'unix'],
      '@stylistic/ts/array-bracket-spacing': ['error', 'never'],
      '@stylistic/ts/object-curly-spacing': ['error', 'always'],
      '@stylistic/ts/template-curly-spacing': ['error', 'never'],
      '@stylistic/ts/eol-last': ['error', 'always'],
      '@stylistic/ts/key-spacing': ['error', { beforeColon: false }],
      '@stylistic/ts/max-len': [
        'error',
        {
          code: 120,
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true
        }
      ],
      '@stylistic/ts/no-multi-spaces': 'error',
      '@stylistic/ts/no-multiple-empty-lines': 'error',
      '@stylistic/ts/no-tabs': 'error',
      '@stylistic/ts/quotes': ['error', 'single'],
      '@stylistic/ts/semi': ['error', 'always'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true
        }
      ],
      '@typescript-eslint/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'semi',
            requireLast: true
          },
          singleline: {
            delimiter: 'semi',
            requireLast: false
          }
        }
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/prefer-readonly': 'warn',
      'comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'always-multiline'
        }
      ],
      'default-case': 'warn',
      'default-param-last': 'error',
      'id-length': [
        'error',
        {
          min: 2,
          exceptions: ['a', 'b', 'c', 'e', 'i', 'j', 'k', 'r', 'v', '_', 'x', 'y', 'z'],
          properties: 'never'
        }
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'require-await': 'error',
      'regex/invalid': [
        'error',
        [
          {
            id: 'jsdoc-param-returns-brackets-force-spaces',
            regex: '(\\*\\s\\@(param|returns|throws)\\s)\\{(?:(\\S.*\\S)|(\\S.*\\s)|(\\s.*\\S))\\}',
            message:
                'There should be a space after the opening curly bracket and before the closing one in JSDoc comments.',
            replacement: {
              function: 'return `${$[1]}{ ${($[3] || $[4] || $[5]).trim()} }`'
            }
          },
          {
            id: 'remove-ts-tsx-extensions',
            regex: "(import|export)\\s+([\\s\\S]*?)\\s+from\\s+['\\\"]([\\s\\S]*?)\\.(ts|tsx)['\\\"];",
            message: 'File extensions are not permitted in import or export statements.',
            replacement: {
              function: 'return `${$[1]} ${$[2]} from \'${$[3]}\';`'
            }
          }
        ]
      ],
      'unused-imports/no-unused-imports': 'error'
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ['src/**/*.{tsx,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHookPlugin,
      'react-refresh': reactRefreshPlugin
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      'react/display-name': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unescaped-entities': 'error',
      'react/no-unknown-property': 'error',
      'react/no-unsafe': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/require-render-return': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }]
    }
  },
  {
    files: ['src/app/api/**/*.ts'],
    rules: {
      'require-await': 'off'
    }
  },
  {
    files: ['src/app/**/layout.tsx', 'src/app/**/page.tsx', 'src/app/**/loading.tsx', 'src/app/**/error.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  },
  {
    files: [
      '**/*.{test,spec}.{ts,tsx}',
      '**/*.{config,conf}.{ts,mts,cts}',
      '**/*.workspace.ts',
      '**/tests/**/*.ts',
      '**/tests/**/*.tsx',
      'e2e/**/*.ts'
    ],
    languageOptions: {
      parserOptions: {
        projectService: false
      }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/prefer-readonly': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'require-await': 'off'
    }
  },
  eslintConfigPrettier
];
