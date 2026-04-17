import { User } from '../types';

export const storeUserInfo = (user: User) => {
  localStorage.setItem('user_info', JSON.stringify(user));
};

export const clearUserInfo = () => {
  localStorage.removeItem('user_info');
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
