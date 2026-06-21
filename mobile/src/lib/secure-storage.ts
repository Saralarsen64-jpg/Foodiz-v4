import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

export const secureStorage = {
  async getItem(key: string) {
    const count = Number(
      (await SecureStore.getItemAsync(`${key}.chunks`)) || 0,
    );
    if (!Number.isInteger(count) || count < 1) return null;

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(`${key}.${index}`),
      ),
    );
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join('');
  },

  async setItem(key: string, value: string) {
    const previousCount = Number(
      (await SecureStore.getItemAsync(`${key}.chunks`)) || 0,
    );
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) || [''];

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${key}.${index}`, chunk),
      ),
    );
    await SecureStore.setItemAsync(`${key}.chunks`, String(chunks.length));

    await Promise.all(
      Array.from(
        { length: Math.max(0, previousCount - chunks.length) },
        (_, index) =>
          SecureStore.deleteItemAsync(`${key}.${chunks.length + index}`),
      ),
    );
  },

  async removeItem(key: string) {
    const count = Number(
      (await SecureStore.getItemAsync(`${key}.chunks`)) || 0,
    );
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(`${key}.${index}`),
      ),
    );
    await SecureStore.deleteItemAsync(`${key}.chunks`);
  },
};
