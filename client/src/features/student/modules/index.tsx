'use client';

import React from 'react';
// Reuse the ModuleList component created for the home page
import { ModuleList } from '@/features/student/home/ModuleList';
// Import components for filtering/search later if needed
// import { ModuleFilterControls } from './ModuleFilterControls';

const ModulesFeature = () => {
  // TODO: Add state for filters/search term later

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Browse Modules</h1>
      {/* TODO: Add Filter/Search Component */}
      {/* <ModuleFilterControls /> */}
      <div>
        <ModuleList /> {/* Reuse the existing list component */}
      </div>
    </div>
  );
} 

export default ModulesFeature;