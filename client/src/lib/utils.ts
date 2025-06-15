import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to get initials from a name string
export function getInitials(name: string): string {
  if (!name) return '?'; // Return placeholder if name is empty
  
  const words = name.split(' ').filter(Boolean); // Split by space and remove empty strings
  
  if (words.length === 0) return '?';
  
  if (words.length === 1) {
    // Single word: Take the first two letters if available, otherwise just the first
    return words[0].substring(0, 2).toUpperCase(); 
  } else {
    // Multiple words: Take the first letter of the first two words
    return (words[0][0] + (words[1][0] || '')).toUpperCase();
  }
}

/**
 * Utility function to get consistent mobile margin classes for auth pages
 * Provides proper spacing on mobile devices while maintaining desktop layout
 */
export function getMobileAuthMargins() {
  return "px-4 sm:px-6 md:px-8";
}

/**
 * Utility function to get responsive card classes for auth forms
 * Makes cards wider on desktop and blend with background on mobile
 */
export function getAuthCardClasses() {
  return "sm:min-w-[600px] w-full max-w-md sm:max-w-4xl mx-auto sm:border sm:shadow-md border-0 shadow-none sm:bg-card bg-transparent";
}

/**
 * Maps module type to display name
 * @param type - The module type ('custom' | 'curated')
 * @returns The display name for the module type
 */
export function getModuleTypeDisplayName(type: 'custom' | 'curated'): string {
  switch (type) {
    case 'custom':
      return 'Private';
    case 'curated':
      return 'Public';
    default:
      return type; // fallback to original value
  }
}