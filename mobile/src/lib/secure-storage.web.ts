const memoryStorage = new Map<string, string>();

function browserStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export const secureStorage = {
  async getItem(key: string) {
    return browserStorage()?.getItem(key) ?? memoryStorage.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    const storage = browserStorage();
    if (storage) storage.setItem(key, value);
    else memoryStorage.set(key, value);
  },
  async removeItem(key: string) {
    const storage = browserStorage();
    if (storage) storage.removeItem(key);
    else memoryStorage.delete(key);
  },
};
