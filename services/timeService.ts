
import { loadSettings, saveSettings } from './storageService';

/**
 * Returns the current "System Time" of the application.
 * This applies the user-defined offset to the browser's real time.
 */
export const getAppTime = (): Date => {
  const settings = loadSettings();
  const realNow = Date.now();
  // if offsetMs is positive, the user set the clock ahead.
  const appTimeMs = realNow + (settings.timeSettings?.offsetMs || 0);
  return new Date(appTimeMs);
};

/**
 * Sets the App Time by calculating the offset between the target time and "Right Now".
 */
export const setAppTime = (targetDate: Date): void => {
  const settings = loadSettings();
  const realNow = Date.now();
  const offsetMs = targetDate.getTime() - realNow;
  
  settings.timeSettings = {
    ...settings.timeSettings,
    offsetMs
  };
  saveSettings(settings);
};

/**
 * Updates the preferred Time Zone.
 */
export const setTimeZone = (timeZone: string): void => {
  const settings = loadSettings();
  settings.timeSettings = {
    ...settings.timeSettings,
    timeZone
  };
  saveSettings(settings);
};

/**
 * Formats a date object or string into YYYY-MM-DD for input fields,
 * respecting the App's chosen Time Zone.
 */
export const getAppDateString = (dateInput?: Date | string): string => {
  const date = dateInput ? new Date(dateInput) : getAppTime();
  const settings = loadSettings();
  const timeZone = settings.timeSettings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // We use Intl to formatting parts to construct YYYY-MM-DD in the specific timezone
  const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA outputs YYYY-MM-DD
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(date);
};

/**
 * Formats a date for display (e.g. "Dec 31, 2024") respecting App Time Zone.
 */
export const formatAppDisplayDate = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  const settings = loadSettings();
  const timeZone = settings.timeSettings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

/**
 * Formats a date for detailed display (e.g. "Dec 31, 2024, 10:00 AM")
 */
export const formatAppDisplayDateTime = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  const settings = loadSettings();
  const timeZone = settings.timeSettings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
};

export const getCurrentTimeZone = (): string => {
    const settings = loadSettings();
    return settings.timeSettings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
};
