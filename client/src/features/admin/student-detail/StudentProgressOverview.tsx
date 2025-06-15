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
import { 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Loader2, 
  MoreHorizontal,
  Eye,
  FileText,
  Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const handleViewReport = (progress: StudentProgressSchema) => {
    router.push(`/admin/students/${studentId}/${progress.moduleId}/report`);
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
    <TooltipProvider>
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
                <TableHead className="text-center w-12">Status</TableHead>
                <TableHead className="text-center w-20">Score</TableHead>
                <TableHead className="text-center w-12 hidden md:table-cell">Feedback</TableHead>
                <TableHead className="w-12"></TableHead>
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
                        <div className="flex items-center justify-between gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px] cursor-help">
                                {moduleTitle}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{moduleTitle}</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleReviewButton(progress)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {progress.completed && progress.score && progress.teacherFeedback && (
                                <DropdownMenuItem onClick={() => handleViewReport(progress)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Report
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              {progress.completed ? (
                                progress.score && progress.teacherFeedback ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <MessageSquare className="h-4 w-4 text-yellow-600" />
                                )
                              ) : (
                                <Clock className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {progress.completed ? (
                                progress.score && progress.teacherFeedback ? 'Completed' : 'Awaiting Marking'
                              ) : 'In Progress'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        {progress.score !== null ? `${progress.score}%` : 'N/A'}
                      </TableCell>
                      
                      <TableCell className="text-center hidden md:table-cell">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              {progress.teacherFeedback ? (
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <div className="h-4 w-4 flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">-</span>
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{progress.teacherFeedback ? 'Feedback Provided' : 'No Feedback'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      
                      <TableCell>
                        {/* Empty cell for spacing */}
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
    </TooltipProvider>
  );
} 