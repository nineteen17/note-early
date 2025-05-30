'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminStudentProfileQuery } from '@/hooks/api/admin/students/useAdminStudentProfileQuery';
import { useResetStudentPinMutation } from '@/hooks/api/admin/students/useResetStudentPinMutation';
import { useDeleteStudentMutation } from '@/hooks/api/admin/students/useDeleteStudentMutation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetStudentPinSchema, ResetStudentPinInput } from '@/lib/schemas/student';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; 
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Edit, UserCircle, BookOpen, Activity, Calendar, CheckCircle, KeyRound, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { getInitials } from '@/lib/utils';
import { EditStudentModal } from '@/features/admin/edit-student-modal';
import { ProfileDTO } from '@/types/api';
import { StudentProgressOverview } from '@/features/admin/student-detail/StudentProgressOverview';

// Add onEdit, onResetPin, and onDelete props to trigger modal open
interface StudentDetailDisplayProps {
  profile: ProfileDTO;
  onEdit: () => void;
  onResetPin: () => void;
  onDelete: () => void;
}

function StudentDetailDisplay({ profile, onEdit, onResetPin, onDelete }: StudentDetailDisplayProps) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Avatar className="h-20 w-20 border">
          <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.fullName ?? 'Student'} />
          <AvatarFallback>{getInitials(profile.fullName ?? 'S')}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <CardTitle className="text-2xl mb-1">{profile.fullName || 'Student Profile'}</CardTitle>
          <CardDescription>Student ID: {profile.profileId}</CardDescription>
          <Badge variant={profile.role === 'STUDENT' ? "secondary" : "outline"} className="mt-2">
              {profile.role}
          </Badge>
        </div>
        <div className="flex space-x-2">
           <Button variant="outline" size="icon" onClick={onEdit}> 
             <Edit className="h-4 w-4" />
             <span className="sr-only">Edit Student</span>
           </Button>
           <Button variant="outline" size="icon" onClick={onResetPin}> 
             <KeyRound className="h-4 w-4" />
             <span className="sr-only">Reset PIN</span>
           </Button>
           <Button variant="destructive" size="icon" onClick={onDelete}> 
             <Trash2 className="h-4 w-4" />
             <span className="sr-only">Delete Student</span>
           </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg mb-2">Details</h3>
          <p className="text-sm flex items-center"><UserCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Age: {profile.age ?? 'N/A'}</p>
          <p className="text-sm flex items-center"><BookOpen className="mr-2 h-4 w-4 text-muted-foreground" /> Reading Level: {profile.readingLevel ?? 'N/A'}</p>
          <p className="text-sm flex items-center"><Calendar className="mr-2 h-4 w-4 text-muted-foreground" /> Joined: {profile.createdAt ? format(new Date(profile.createdAt), 'PPP') : 'N/A'}</p>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg mb-2">Progress Summary</h3>
          <p className="text-sm flex items-center"><CheckCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Modules Completed: {profile.completedModulesCount ?? 0}</p>
          {/* Placeholder for more progress stats */}
          <p className="text-sm text-muted-foreground italic">(More detailed progress coming soon)</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const profileId = params.profileId as string | undefined;

  const { data: profile, isLoading, isError, error } = useAdminStudentProfileQuery(profileId);
  const resetPinMutation = useResetStudentPinMutation();
  const deleteMutation = useDeleteStudentMutation();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPinDialogOpen, setResetPinDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form for reset PIN dialog
  const { 
    handleSubmit: handlePinSubmit,
    control,
    formState: { errors: resetPinErrors },
    reset: resetPinForm,
  } = useForm<ResetStudentPinInput>({
    resolver: zodResolver(resetStudentPinSchema),
    defaultValues: { newPin: '' },
  });

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    if (profileId) {
      queryClient.invalidateQueries({ queryKey: ['admin', 'studentProfile', profileId] });
    }
    queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }); 
  };

  // Open reset PIN dialog
  const handleOpenResetPinDialog = () => {
    resetPinForm({ newPin: '' });
    setResetPinDialogOpen(true);
  };

  // Close reset PIN dialog
  const handleCloseResetPinDialog = () => {
    setResetPinDialogOpen(false);
    resetPinForm({ newPin: '' });
  };

  // Handle Reset PIN form submission
  const onResetPinSubmit = (data: ResetStudentPinInput) => {
    if (profile?.profileId) {
      resetPinMutation.mutate(
        { studentId: profile.profileId, newPin: data.newPin },
        {
          onSuccess: () => {
            handleCloseResetPinDialog();
          },
          onError: () => {
             // Error toast is handled by the mutation hook 
          }
        }
      );
    }
  };

  // --- Delete Handlers ---
  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };
  const confirmDelete = () => {
    if (profile?.profileId) {
      deleteMutation.mutate(profile.profileId, {
        onSuccess: () => {
          handleCloseDeleteDialog();
          router.push('/admin/students');
        },
        onError: () => {
          // Toast handled by hook
        }
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
      </Button>

      {isLoading && (
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-grow space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-5 w-16 mt-1" />
            </div>
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
             <div className="space-y-3">
                 <Skeleton className="h-5 w-1/4 mb-2" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-3/4" />
             </div>
             <div className="space-y-3">
                 <Skeleton className="h-5 w-1/3 mb-2" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-2/3" />
             </div>
          </CardContent>
        </Card>
      )}

      {isError && !isLoading && (
        <Alert variant="destructive">
          <Activity className="h-4 w-4" />
          <AlertTitle>Error Loading Student</AlertTitle>
          <AlertDescription>
            {error?.message || "Could not load the student details. Please try again or go back."}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && profile && (
        <StudentDetailDisplay 
           profile={profile} 
           onEdit={handleOpenEditModal} 
           onResetPin={handleOpenResetPinDialog}
           onDelete={handleOpenDeleteDialog}
        />
      )}

      {profileId && (
          <div className="mt-8">
             <StudentProgressOverview studentId={profileId} />
          </div>
      )}

      {profile && (
        <EditStudentModal
          student={profile}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
        />
      )}

      <AlertDialog open={isResetPinDialogOpen} onOpenChange={setResetPinDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset PIN for {profile?.fullName || 'Student'}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new 4-digit PIN for the student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handlePinSubmit(onResetPinSubmit)} id="reset-pin-form" className="space-y-4 py-2">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="newPin" className="sr-only">New PIN</Label>
              <Controller
                control={control}
                name="newPin"
                render={({ field }) => (
                  <InputOTP 
                    maxLength={4} 
                    {...field}
                    id="newPin"
                    aria-describedby="newPin-error"
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
              {resetPinErrors.newPin && (
                <p id="newPin-error" className="text-sm text-red-600">
                  {resetPinErrors.newPin.message}
                </p>
              )}
            </div>
          </form>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseResetPinDialog}>Cancel</AlertDialogCancel>
            <Button 
              type="submit" 
              form="reset-pin-form"
              disabled={resetPinMutation.isPending}
            >
              {resetPinMutation.isPending ? "Resetting..." : "Reset PIN"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {profile?.fullName || 'Student'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student&apos;s profile
              and all associated data (progress, summaries, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
             >
              {deleteMutation.isPending ? "Deleting..." : "Yes, delete student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
} 