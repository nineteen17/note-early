'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';

export function QuickLinks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Links</CardTitle>
        <CardDescription>Navigate to key sections.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-2">
        <Button variant="outline" asChild>
          <Link href="/admin/students">Manage Students</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/modules">Manage Modules</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/settings">Account Settings</Link>
        </Button>
      </CardContent>
    </Card>
  );
} 