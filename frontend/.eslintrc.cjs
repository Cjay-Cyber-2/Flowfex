module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  ignorePatterns: ['dist/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/lib/supabase/admin', '**/lib/supabase/admin.*'],
            message: 'Frontend files must never import lib/supabase/admin. Use browser-safe service modules instead.',
          },
        ],
      },
    ],
  },
};
