'use client';

import React from 'react';
import { useStudentModuleProgressQuery } from '@/hooks/api/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns'; // For relative dates
import { StudentProgressDetailsDTO } from '@/shared/types';

interface StudentModuleDetailsProps {
  moduleId: string;
}

const StudentModuleDetails = ({ moduleId }: StudentModuleDetailsProps) => {
  const {
    data: progressDetails,
    isLoading,
    isError,
    error,
  } = useStudentModuleProgressQuery(moduleId);

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-3/4" /> {/* Title Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-3/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-20 w-full" />
             <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Error State ---
  if (isError || !progressDetails) {
    console.error("StudentModuleDetails: Failed to load progress details.", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Progress Details</AlertTitle>
        <AlertDescription>
          {error?.message || 'Could not load the progress details for this module. Please try again later.'}
        </AlertDescription>
      </Alert>
    );
  }

  const { progress, submissions } = progressDetails;

  // Helper function for formatting dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Invalid Date';
    }
  };

  // --- Render Details ---
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Module Progress Details</h1>
      {/* TODO: Fetch and display Module Title */}
      <p className="text-sm text-muted-foreground">Module ID: {moduleId}</p>

      {progress ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Progress</span>
              <Badge variant={progress.completed ? "default" : "secondary"}>
                {progress.completed ? 'Completed' : 'In Progress'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Started: {formatDate(progress.startedAt)} |
              Last Updated: {formatDate(progress.updatedAt)}
              {progress.completedAt && ` | Completed: ${formatDate(progress.completedAt)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Score</h3>
              <p className="text-lg font-semibold">{progress.score ?? 'Not Scored'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Time Spent</h3>
              <p>{progress.timeSpentMinutes ? `${progress.timeSpentMinutes} minutes` : 'Not Tracked'}</p>
            </div>
             <div>
              <h3 className="text-sm font-medium text-muted-foreground">Highest Paragraph Reached</h3>
              <p>{progress.highestParagraphIndexReached ?? 'Not Started'}</p>
            </div>
             {progress.finalSummary && (
                <div>
                 <h3 className="text-sm font-medium text-muted-foreground">Final Summary</h3>
                 <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{progress.finalSummary}</p>
               </div>
             )}
            {progress.teacherFeedback && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Teacher Feedback</h3>
                <p className="text-sm italic bg-blue-50 p-3 rounded-md border border-blue-200">
                    {progress.teacherFeedback}
                    {progress.teacherFeedbackAt && (
                        <span className="block text-xs text-blue-600 mt-1">
                            (Feedback given {formatDate(progress.teacherFeedbackAt)})
                        </span>
                    )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Progress Not Found</CardTitle>
          </CardHeader>
           <CardContent>
             <p className="text-muted-foreground">No progress record found for this module.</p>
           </CardContent>
        </Card>
      )}

      {submissions && submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Paragraph Submissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submissions
              .sort((a, b) => a.paragraphIndex - b.paragraphIndex) // Sort by paragraph index
              .map((sub) => (
                <div key={sub.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <h4 className="font-semibold mb-1">Paragraph {sub.paragraphIndex}</h4>
                  <p className="text-xs text-muted-foreground mb-2">Submitted: {formatDate(sub.submittedAt)}</p>
                  <div className="space-y-2">
                     <div>
                         <h5 className="text-sm font-medium text-muted-foreground mb-1">Paragraph Summary:</h5>
                         <p className="text-sm whitespace-pre-wrap bg-muted p-2 rounded-md">{sub.paragraphSummary}</p>
                     </div>
                      <div>
                         <h5 className="text-sm font-medium text-muted-foreground mb-1">Cumulative Summary (at this point):</h5>
                         <p className="text-sm whitespace-pre-wrap bg-muted p-2 rounded-md">{sub.cumulativeSummary}</p>
                     </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StudentModuleDetails;