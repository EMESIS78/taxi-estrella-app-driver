// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    root: true,
    extends: ['eslint-config-expo'],
    plugins: ['import'],
    settings: {
        'import/resolver': {
            alias: {
                map: [
                    ['@env', './path/to/your/env/file'], // ⚠️ No importa el path real, es simbólico
                ],
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            },
        },
    },
  },
]);
