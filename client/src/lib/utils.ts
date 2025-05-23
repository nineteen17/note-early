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
