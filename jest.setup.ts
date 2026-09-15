// Test-only public configuration. No real endpoint or key is used by tests.
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test.invalid/api/v1';
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_placeholder';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});
