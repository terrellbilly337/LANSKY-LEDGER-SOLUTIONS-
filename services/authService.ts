import { APP_PIN_KEY } from '../constants';

const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const setPin = async (pin: string): Promise<void> => {
  const hash = await hashPin(pin);
  localStorage.setItem(APP_PIN_KEY, hash);
};

export const verifyPin = async (pin: string): Promise<boolean> => {
  const storedHash = localStorage.getItem(APP_PIN_KEY);
  if (!storedHash) return false;
  
  const attemptHash = await hashPin(pin);
  return attemptHash === storedHash;
};

export const hasPin = (): boolean => {
  return !!localStorage.getItem(APP_PIN_KEY);
};

export const removePin = (): void => {
  localStorage.removeItem(APP_PIN_KEY);
};
