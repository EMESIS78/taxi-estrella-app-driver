// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
    expoConfig,
    {
        ignores: ['node_modules/**', 'dist/**', '.expo/**', 'android/**', 'ios/**', 'scripts/**'],
    },
    {
        settings: {
            // `@env` is a virtual module generated at build time by react-native-dotenv.
            'import/core-modules': ['@env'],
        },
        rules: {
            'react-hooks/exhaustive-deps': 'warn',
        },
    },
    {
        files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}', 'jest.setup.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
    },
]);
