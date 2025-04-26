'use client';

import NextTopLoader from 'nextjs-toploader';

export function TopLoader() {
  // Configure the top loader bar
  // See https://github.com/ThePrimeagen/nextjs-toploader for options
  console.log("TopLoader has rendered")

  return (
    <NextTopLoader
      color="hsl(var(--primary))" // Use primary color via CSS variable
      initialPosition={0.08}
      crawlSpeed={200}
      height={3} // Standard height
      crawl={true}
      showSpinner={false} // Usually looks cleaner without the spinner
      easing="ease"
      speed={200}
      // Optional: Add a shadow matching the primary color
      shadow={`0 0 10px hsl(var(--primary)), 0 0 5px hsl(var(--primary))`}
      zIndex={1600} // Default z-index
    />
  );
}
