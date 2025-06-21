import React from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css"; // Adjust if your globals.css is elsewhere
import QueryProvider from "@/providers/QueryProvider"; // Path relative to src/
import { Toaster } from "@/components/ui/sonner"; // Path relative to src/
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from "@/providers/AuthProvider";
import { TopLoader } from "@/components/skeletons/TopLoader";
import { ScrollToTop } from '@/components/ScrollToTop';


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NoteEarly",
  description: "NoteEarly Platform - Client Application",
  icons: {
    icon: '/note-early-icon-logo.png',
    shortcut: '/note-early-icon-logo.png',
    apple: '/note-early-icon-logo.png',
  },
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
              <ScrollToTop />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
