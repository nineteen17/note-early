'use client';
import React, { useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * AuthProvider Component
 * Ensures application waits until initial auth state is loaded from storage
 * and updates the global isLoading state in the authStore.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // State to track if the initial state hydration is done
  const [isReady, setIsReady] = useState(false);
  
  // Get the action to set the global loading state
  const setIsLoading = useAuthStore((state) => state.setIsLoading);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    // The token should already be hydrated from localStorage by Zustand's persist middleware
    console.log("AuthProvider: Initializing with token:", token ? "Token exists" : "No token");
    
    // Set global loading to false since we've now checked storage
    setIsLoading(false);
    setIsReady(true);
    
  }, [setIsLoading, token]);

  // Display loading state until ready
  // if (!isReady) {
  //   return <div>Initializing session...</div>;
  // }

  // Once ready, render the children
  return <>{children}</>;
}