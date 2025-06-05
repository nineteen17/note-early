// hooks/useCopyToClipboard.ts
import { useState, useCallback } from 'react';

interface UseCopyToClipboardReturn {
  copyToClipboard: (text: string) => Promise<boolean>;
  copied: boolean;
  error: string | null;
}

export const useCopyToClipboard = (): UseCopyToClipboardReturn => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (!text) {
      setError('No text provided to copy');
      return false;
    }

    try {
      setError(null);

      // Check if we're in a browser environment and have a secure context
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return true;
      } else {
        // Fallback method for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Make the textarea invisible but still focusable
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.setAttribute('readonly', '');
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        
        // Focus and select the text
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 99999); // For mobile devices
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return true;
        } else {
          throw new Error('Copy command failed');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to copy text';
      setError(errorMessage);
      console.error('Copy to clipboard failed:', err);
      return false;
    }
  }, []);

  return {
    copyToClipboard,
    copied,
    error,
  };
};