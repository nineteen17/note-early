"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Set default staleTime (e.g., 5 minutes). Adjust as needed.
        staleTime: 1000 * 60 * 5,
        // Default retry attempts
        retry: 1,
        // Default refetch behavior on window focus
        refetchOnWindowFocus: true, // Can set to false if preferred
      },
    },
  });
}

// Use a module-scoped variable to ensure the client is created only once per browser session
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client to avoid cross-request data sharing
    return makeQueryClient();
  } else {
    // Browser: use singleton pattern
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Render DevTools only in development environment */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
} 