/**
 * Tater Identity System
 *
 * Generates anonymous identities for collaborative annotation sharing.
 * Format: {adjective}-tater-{noun}
 * Examples: "swift-tater-falcon", "gentle-tater-crystal"
 */

import { uniqueUsernameGenerator, adjectives, nouns } from 'unique-username-generator';
import { storage } from './storage';

const STORAGE_KEY = 'plannotator-identity';

/**
 * Generate a new tater identity
 */
export function generateIdentity(): string {
  // Use a unique separator to split adjective from noun, avoiding issues
  // with compound words that contain hyphens (e.g., "behind-the-scenes")
  const generated = uniqueUsernameGenerator({
    dictionaries: [adjectives, nouns],
    separator: '|||',
    style: 'lowerCase',
    randomDigits: 0,
    length: 50, // Prevent word truncation (default is too short)
  });

  const [adjective, noun] = generated.split('|||');
  return `${adjective}-${noun}-tater`;
}

/**
 * Get current identity from storage, or generate one if none exists
 */
export function getIdentity(): string {
  const stored = storage.getItem(STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const identity = generateIdentity();
  saveIdentity(identity);
  return identity;
}

/**
 * Save identity to storage
 */
export function saveIdentity(identity: string): void {
  storage.setItem(STORAGE_KEY, identity);
}

/**
 * Regenerate identity and save to storage
 */
export function regenerateIdentity(): string {
  const identity = generateIdentity();
  saveIdentity(identity);
  return identity;
}

/**
 * Check if an identity belongs to the current user
 */
export function isCurrentUser(author: string | undefined): boolean {
  if (!author) return false;
  return storage.getItem(STORAGE_KEY) === author;
}
