// Global Jest setup: loaded before every test file (see "jest.setupFiles" in package.json).

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
