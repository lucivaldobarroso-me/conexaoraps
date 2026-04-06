import { User } from '../types';

export const storeUserInfo = (user: User) => {
  localStorage.setItem('user_info', JSON.stringify(user));
};

export const clearUserInfo = () => {
  localStorage.removeItem('user_info');
};

export const readStoredUserInfo = (): User | null => {
  try {
    const raw = localStorage.getItem('user_info');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.nomeCompleto) return null;
    return parsed as User;
  } catch {
    return null;
  }
};

export const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};
