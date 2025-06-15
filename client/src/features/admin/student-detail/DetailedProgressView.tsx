'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminStudentModuleDetailQuery } from '@/hooks/api/admin/progress/useAdminStudentModuleDetailQuery';
import { useAdminUpdateProgressMutation } from '@/hooks/api/admin/progress/useAdminUpdateProgressMutation';
import { adminUpdateProgressSchema, AdminUpdateProgressFormInput } from '@/lib/schemas/progress';
import { StudentProgressDetailsDTO } from '@/types/api'; // Import the type
import { Button } from "@/components/ui/button";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter, 
    DialogClose 
} from "@/components/ui/dialog"; // Using Dialog for presentation
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, BookOpen, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface DetailedProgressViewProps {
  studentId: string;
  moduleId: string;
  progressId: string; // Pass progressId for the update mutation
  moduleTitle: string;
  isOpen: boolean; // Control dialog visibility from parent
  onClose: () => void;
}

export function DetailedProgressView({ 
  studentId, 
  moduleId, 
  progressId, 
  moduleTitle, 
  isOpen, 
  onClose 
}: DetailedProgressViewProps) {
  const { 
    data: details, 
    isLoading, 
    isError, 
    error 
  } = useAdminStudentModuleDetailQuery(studentId, moduleId, { enabled: isOpen }); // Only fetch when open

  const updateMutation = useAdminUpdateProgressMutation();

  const { 
    register, 
    handleSubmit, 
    control, // For controlled components like Checkbox
    reset, 
    formState: { errors, isDirty } // Use isDirty to enable save button
  } = useForm<AdminUpdateProgressFormInput>({ 
    resolver: zodResolver(adminUpdateProgressSchema),
    // Set default values when data loads
    values: { 
      score: details?.progress?.score ?? null, 
      teacherFeedback: details?.progress?.teacherFeedback ?? null,
      completed: details?.progress?.completed ?? false,
    },
    resetOptions: {
        keepDirtyValues: false, // Reset dirty state on reset
    }
  });

  React.useEffect(() => {
    // Reset form when details data changes (e.g., after opening or refetch)
    if (details) {
      reset({ 
        score: details.progress?.score ?? null, 
        teacherFeedback: details.progress?.teacherFeedback ?? null,
        completed: details.progress?.completed ?? false,
      });
    }
  }, [details, reset]);

  const onSubmit = (data: AdminUpdateProgressFormInput) => {
    console.log("Submitting feedback/score:", data);
    updateMutation.mutate(
      { progressId, data },
      {
        onSuccess: () => {
          // Optionally close dialog on success, or let parent handle based on toast
          // onClose(); 
          // Reset form to show non-dirty state after successful save
          reset(data); 
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}> 
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Progress Details: {moduleTitle}</DialogTitle>
          <DialogDescription>
            Review student submissions and provide feedback or score.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-4 space-y-6"> {/* Make content scrollable */}
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-6 w-1/3 mt-4" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Details</AlertTitle>
              <AlertDescription>
                {error?.message || "Could not load progress details."}
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && details && (
            <>
              {/* Submissions Section */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Submissions</h3>
                {details.submissions.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto border rounded-md p-3 bg-muted/20">
                    {details.submissions.map((sub, index) => (
                      <div key={sub.id || index} className="text-sm border-b pb-2 last:border-b-0">
                        <p className="font-medium">Paragraph {sub.paragraphIndex}:</p>
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                          {sub.paragraphSummary}
                        </p>
                         <p className="text-xs text-muted-foreground mt-1">
                           Submitted: {format(new Date(sub.submittedAt), 'Pp')}
                         </p>
                        {/* Optionally show cumulative summary */}
                        {/* <p className="font-medium mt-2">Cumulative:</p>
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{sub.cumulativeSummary}</p> */}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No paragraph summaries submitted yet.</p>
                )}
              </div>

              {/* Feedback & Score Form */}
              <form onSubmit={handleSubmit(onSubmit)} id="feedback-form" className="space-y-4 pt-4 border-t">
                 <h3 className="text-lg font-semibold mb-2">Feedback & Grading</h3>
                 
                 {/* Display Progress Status */}
                 <div className="text-sm text-muted-foreground space-y-1">
                     <p>Status: {details.progress?.completed ? 'Completed' : 'In Progress'}</p>
                     {details.progress?.completedAt && 
                        <p>Completed On: {format(new Date(details.progress.completedAt), 'Pp')}</p>}
                     {details.progress?.teacherFeedbackAt && 
                        <p>Feedback Last Updated: {format(new Date(details.progress.teacherFeedbackAt), 'Pp')}</p>}
                 </div>

                 <div className="space-y-1">
                  <Label htmlFor="teacherFeedback">Feedback</Label>
                  <Textarea 
                    id="teacherFeedback"
                    {...register("teacherFeedback")}
                    placeholder="Provide constructive feedback for the student..."
                    className="min-h-[100px]"
                    aria-describedby="teacherFeedback-error"
                    autoFocus={false}
                  />
                   {errors.teacherFeedback && (
                     <p id="teacherFeedback-error" className="text-sm text-red-600">
                       {errors.teacherFeedback.message}
                     </p>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                   <div className="space-y-1">
                      <Label htmlFor="score">Score (%)</Label>
                      <Input 
                        id="score"
                        type="number"
                        min="0"
                        max="100"
                        {...register("score", { valueAsNumber: true })} 
                        placeholder="0-100"
                        aria-describedby="score-error"
                        autoFocus={false}
                      />
                       {errors.score && (
                         <p id="score-error" className="text-sm text-red-600">
                           {errors.score.message}
                         </p>
                       )}
                   </div>
                   <div className="flex items-center space-x-2 pt-5">
                     <Controller
                        control={control}
                        name="completed"
                        render={({ field }) => (
                             <Checkbox
                                id="completed"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                aria-describedby="completed-error"
                            />
                        )}
                     />
                      <Label htmlFor="completed" className="cursor-pointer">
                        Mark as Completed
                      </Label>
                      {errors.completed && (
                        <p id="completed-error" className="text-sm text-red-600">
                          {errors.completed.message}
                        </p>
                      )}
                   </div>
                </div>
              </form>
            </>
          )}
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          </DialogClose>
          <Button 
            type="submit" 
            form="feedback-form"
            disabled={!isDirty || updateMutation.isPending || isLoading}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 