'use client';

import NextTopLoader from 'nextjs-toploader';

export function TopLoader() {
  // Configure the top loader bar
  // See https://github.com/ThePrimeagen/nextjs-toploader for options
  console.log("TopLoader has rendered")

  return (
    <NextTopLoader
      color="var(--accent)" // Use our accent color (orange)
      initialPosition={0.08}
      crawlSpeed={200}
      height={2} // Slightly thinner line
      crawl={true}
      showSpinner={false} // Usually looks cleaner without the spinner
      easing="ease"
      speed={200}
      // Optional: Add a shadow matching the primary color
      shadow="0 0 10px var(--accent), 0 0 5px var(--accent)"
      zIndex={1600} // Default z-index
    />
  );
}
