"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Scale, Shield, Cookie, Database, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoteEarlyLogo } from "@/components/NoteEarlyLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import Tos from "./tos";
import PrivacyPolicy from "./privacy-policy";
import CookiePolicy from "./cookie-policy";
import DataProcessing from "./data-processing";

const legalItems = [
  {
    title: "Terms of Service",
    component: <Tos />,
    icon: Scale,
    description: "Service terms and conditions",
    param: "terms"
  },
  {
    title: "Privacy Policy", 
    component: <PrivacyPolicy />,
    icon: Shield,
    description: "How we protect your privacy",
    param: "privacy"
  },
  {
    title: "Cookie Policy",
    component: <CookiePolicy />,
    icon: Cookie,
    description: "Cookie usage and preferences",
    param: "cookies"
  },
  {
    title: "Data Processing",
    component: <DataProcessing />,
    icon: Database,
    description: "Data processing agreement",
    param: "data-processing"
  },
];

const LegalFeature = ({ selectedItem }: { selectedItem: string }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  
  // Get the document from URL params, fallback to selectedItem prop, then default to first item
  const urlDoc = searchParams.get('doc');
  const initialDoc = urlDoc 
    ? legalItems.find(item => item.param === urlDoc)?.title || selectedItem
    : selectedItem;
  
  const [activeItem, setActiveItem] = useState(initialDoc);
  
  const selectedDocument = legalItems.find(item => item.title === activeItem);
  const selectedComponent = selectedDocument?.component;

  const handleItemClick = (item: typeof legalItems[0]) => {
    setActiveItem(item.title);
    router.push(`/legal?doc=${item.param}`, { scroll: false });
    setMobileMenuOpen(false);
    setMobileDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo and Navigation */}
      <header className="sticky top-0 z-50 border-b border-primary/20 bg-primary text-primary-foreground">
        <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <NoteEarlyLogo className="text-primary-foreground hover:text-accent"/>
          </Link>
            {/* Desktop Auth Buttons */}
            <div className="flex flex-1 items-center justify-end space-x-2">
              <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                <Link href="/signup">Register</Link>
              </Button>
              <ThemeToggle /> 
            </div>
        </div>
      </header>

      {/* Mobile Document Selector */}
      <div className="lg:hidden bg-muted/50 border-b border-border">
        <div className="px-4 py-3">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
          >
            <div className="flex items-center gap-2">
              {selectedDocument && <selectedDocument.icon className="w-4 h-4" />}
              <span className="truncate">{selectedDocument?.title}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {mobileDropdownOpen && (
            <div className="mt-2 space-y-1 bg-card border border-border rounded-lg p-2 shadow-lg">
              {legalItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.title;
                
                return (
                  <Button
                    key={item.title}
                    variant={isActive ? "accent" : "ghost"}
                    size="sm"
                    onClick={() => handleItemClick(item)}
                    className="w-full justify-start gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{item.title}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar Navigation */}
        <div className="hidden lg:block w-80 min-h-screen border-r border-border bg-muted/20">
          <div className="sticky top-14 p-6 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="w-5 h-5 text-popover-foreground" />
                  Legal Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {legalItems.map((item) => {
                  const isActive = activeItem === item.title;
                  const Icon = item.icon;
                  
                  return (
                    <Button
                      key={item.title}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleItemClick(item)}
                      className={`w-full justify-start gap-2 h-auto py-3 px-3 ${
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm">{item.title}</div>
                        <div className="text-xs opacity-80 line-clamp-1">
                          {item.description}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="prose prose-slate dark:prose-invert max-w-none p-4 sm:p-6 lg:p-8">
                  {selectedComponent}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Contact Section */}
          <div className="p-4 sm:p-6 lg:p-8 pt-0">
            <Card className="border-popover-foreground/20 bg-popover-foreground/5">
              <CardContent className="p-4 sm:p-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold text-popover-foreground">
                    Questions about our legal policies?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    If you have any questions about these legal documents or need clarification, 
                    please don't hesitate to contact us.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="mailto:legal@noteearly.com">
                      Contact Legal Team
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalFeature;