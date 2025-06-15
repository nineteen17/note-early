import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminStudentModuleDetailQuery } from '@/hooks/api/admin/progress/useAdminStudentModuleDetailQuery';
import { useAdminUpdateProgressMutation } from '@/hooks/api/admin/progress/useAdminUpdateProgressMutation';
import { ParagraphSubmissionSchema, StudentProgressSchema } from '@/types/api';
import { toast } from 'sonner';

const submissionSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().min(1, "Feedback is required"),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

interface StudentSubmissionsProps {
  studentId: string;
}

export function StudentSubmissions({ studentId }: StudentSubmissionsProps) {
  const [selectedModuleId, setSelectedModuleId] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const { data: moduleDetail, isLoading } = useAdminStudentModuleDetailQuery(
    studentId,
    selectedModuleId ?? undefined,
    { enabled: !!selectedModuleId }
  );

  const updateProgressMutation = useAdminUpdateProgressMutation();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      score: 0,
      feedback: '',
    },
  });

  const onSubmit = (data: SubmissionFormData) => {
    if (!selectedModuleId || !moduleDetail?.progress?.id) return;

    updateProgressMutation.mutate(
      {
        progressId: moduleDetail.progress.id,
        data: {
          score: data.score,
          teacherFeedback: data.feedback,
          completed: true,
        },
      },
      {
        onSuccess: () => {
          toast.success('Progress updated successfully');
          setIsDialogOpen(false);
          reset();
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update progress');
        },
      }
    );
  };

  const getStatusIcon = (progress: StudentProgressSchema | null | undefined) => {
    if (!progress) return <Clock className="h-4 w-4 text-yellow-500" />;
    if (progress.completed) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (progress: StudentProgressSchema | null | undefined) => {
    if (!progress) return <Badge variant="secondary">Not Started</Badge>;
    if (progress.completed) return <Badge variant="blue">Completed</Badge>;
    return <Badge variant="secondary">In Progress</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <p>Loading submissions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Submissions</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {moduleDetail?.submissions.map((submission: ParagraphSubmissionSchema) => (
              <div
                key={submission.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">Paragraph {submission.paragraphIndex}</h4>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {format(new Date(submission.submittedAt), 'PPP')}
                    </p>
                    <p className="text-sm mt-2">
                      <strong>Summary:</strong> {submission.paragraphSummary}
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Cumulative:</strong> {submission.cumulativeSummary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusIcon(moduleDetail.progress)}
                  {getStatusBadge(moduleDetail.progress)}
                  {!moduleDetail.progress?.completed && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => moduleDetail.progress?.moduleId && setSelectedModuleId(moduleDetail.progress.moduleId)}
                        >
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Review Submission</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="score">Score (0-100)</Label>
                            <Input
                              id="score"
                              type="number"
                              {...register('score', { valueAsNumber: true })}
                              autoFocus={false}
                            />
                            {errors.score && (
                              <p className="text-sm text-red-500">{errors.score.message}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="feedback">Feedback</Label>
                            <Textarea
                              id="feedback"
                              {...register('feedback')}
                              placeholder="Enter your feedback here..."
                              autoFocus={false}
                            />
                            {errors.feedback && (
                              <p className="text-sm text-red-500">{errors.feedback.message}</p>
                            )}
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={updateProgressMutation.isPending}
                          >
                            {updateProgressMutation.isPending ? "Submitting..." : "Submit Review"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 