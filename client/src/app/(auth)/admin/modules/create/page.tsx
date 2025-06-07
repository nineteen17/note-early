'use client';

import React from 'react';
import { CreateModuleFeature } from '@/features/admin/create-module';

// This page component simply renders the feature component.
// It can remain a Server Component unless it needs client-side hooks itself.
export default function CreateModulePage() {
  return (

      <CreateModuleFeature />

  );
} 