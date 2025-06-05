'use client'

import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import React from 'react'

const StudentSettingsFeature = () => {
  return (
    <PageContainer>
      <PageHeader 
        title="Settings" 
        description="Account settings and preferences" 
      />
      
      <div className="space-y-6">
        <Alert className="bg-muted/50 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-muted-foreground">
            Most account settings are managed by your administrator. Contact them if you need to make changes to your profile or account details.
          </AlertDescription>
        </Alert>
      </div>
    </PageContainer>
  )
}

export default StudentSettingsFeature