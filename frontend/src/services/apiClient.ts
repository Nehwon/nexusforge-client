export async function apiClient<T>(mockData: T, delay = 100): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockData), delay);
  });
}
