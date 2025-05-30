import React from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css"; // Adjust if your globals.css is elsewhere
import QueryProvider from "@/providers/QueryProvider"; // Path relative to src/
import { Toaster } from "@/components/ui/sonner"; // Path relative to src/
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from "@/providers/AuthProvider";
import { TopLoader } from "@/components/skeletons/TopLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NoteEarly Client", // Updated title
  description: "NoteEarly Platform - Client Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <AuthProvider>
              <TopLoader />
              {children}
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
