'use client';

import React, { useState, useMemo } from 'react';
import { useAdminStudentProgressListQuery } from '@/hooks/api/admin/progress/useAdminStudentProgressListQuery';
import { useActiveModulesQuery } from '@/hooks/api/readingModules/useActiveModulesQuery';
import { StudentProgressSchema, ReadingModuleDTO } from '@/types/api'; // Import types
import { DetailedProgressView } from './DetailedProgressView'; // Import the detailed view component
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from "@/components/ui/card";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, CheckCircle, XCircle, Clock, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

// Define interface for viewing module details/feedback
interface SelectedModuleInfo {
  progressId: string;
  moduleId: string;
  moduleTitle: string; 
}

interface StudentProgressOverviewProps {
  studentId: string;
}

export function StudentProgressOverview({ studentId }: StudentProgressOverviewProps) {
  const router = useRouter();
  const { 
    data: progressList, 
    isLoading: isLoadingProgress,
    isError: isErrorProgress, 
    error: errorProgress 
  } = useAdminStudentProgressListQuery(studentId);

  const { 
    data: activeModules, 
    isLoading: isLoadingModules,
    isError: isErrorModules,
    error: errorModules
  } = useActiveModulesQuery();

  // State to manage the selected module for the detailed view dialog
  const [selectedModule, setSelectedModule] = useState<SelectedModuleInfo | null>(null);

  // Create a map from moduleId to title once modules are loaded
  const moduleTitleMap = useMemo(() => {
    if (!activeModules) return new Map<string, string>();
    return activeModules.reduce((map, module) => {
      map.set(module.id, module.title);
      return map;
    }, new Map<string, string>());
  }, [activeModules]);

  const handleReviewButton = (progress: StudentProgressSchema) => {
    router.push(`/admin/students/${studentId}/${progress.moduleId}/review`);
  };

  const handleCloseDetails = () => {
    setSelectedModule(null);
  };

  // Combine loading states
  const isLoading = isLoadingProgress || isLoadingModules;

  // --- Loading State ---
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Module Progress</CardTitle>
          <CardDescription>Loading student progress...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Error State (handle either error) ---
   if (isErrorProgress || isErrorModules) {
    const errorToShow = errorProgress || errorModules;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Module Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <BookOpen className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>
              {errorToShow?.message || "Could not load required data."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // --- Success State --- 
  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Progress</CardTitle>
        <CardDescription>Overview of modules attempted by the student.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module Title</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center hidden md:table-cell">Feedback</TableHead>
              <TableHead className="text-right">Review</TableHead>
              <TableHead className="text-right">Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!progressList || progressList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No progress records found for this student.
                </TableCell>
              </TableRow>
            ) : (
              progressList.map((progress) => {
                // Get module title from the map
                const moduleTitle = moduleTitleMap.get(progress.moduleId) || `Unknown (ID: ${progress.moduleId.substring(0,8)}...)`;
                
                return (
                  <TableRow key={progress.id}>
                    <TableCell className="font-medium">
                      {moduleTitle} 
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {progress.completed ? (
                        progress.score && progress.teacherFeedback ? (
                          <Badge variant="success" className="flex items-center justify-center w-fit mx-auto">
                            <CheckCircle className="mr-1 h-3 w-3" /> Completed
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 flex items-center justify-center w-fit mx-auto">
                            <MessageSquare className="mr-1 h-3 w-3" /> Awaiting Marking
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary" className="flex items-center justify-center w-fit mx-auto">
                          <Clock className="mr-1 h-3 w-3" /> In Progress
                        </Badge>
                      )}
                     </TableCell>
                    <TableCell className="text-center">
                      {progress.score !== null ? `${progress.score}%` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      {progress.teacherFeedback ? (
                        <Badge variant="default" className="flex items-center justify-center w-fit mx-auto">
                          <MessageSquare className="mr-1 h-3 w-3" /> Provided
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleReviewButton(progress)}
                        >
                          View Details
                        </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      {progress.completed && progress.score && progress.teacherFeedback ? (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/students/${studentId}/${progress.moduleId}/report`)}
                        >
                          View Report
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not Available</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      {/* Render the DetailedProgressView Dialog when a module is selected */} 
      {selectedModule && (
          <DetailedProgressView 
            studentId={studentId}
            moduleId={selectedModule.moduleId}
            progressId={selectedModule.progressId}
            moduleTitle={selectedModule.moduleTitle}
            isOpen={!!selectedModule} // Dialog is open if selectedModule is not null
            onClose={handleCloseDetails} // Pass the close handler
          />
      )}

    </Card>
  );
} 