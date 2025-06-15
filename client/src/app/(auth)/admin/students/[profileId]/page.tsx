'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminStudentProfileQuery } from '@/hooks/api/admin/students/useAdminStudentProfileQuery';
import { useResetStudentPinMutation } from '@/hooks/api/admin/students/useResetStudentPinMutation';
import { useDeleteStudentMutation } from '@/hooks/api/admin/students/useDeleteStudentMutation';
import { useCopyToClipboard } from '@/hooks/useCopyToClipBoard';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; 
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { 
  Edit, 
  UserCircle, 
  BookOpen, 
  Activity, 
  Calendar, 
  KeyRound, 
  Trash2, 
  Copy,
  AlertCircle,
  GraduationCap,
  Check,
  User
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { getInitials, cn } from '@/lib/utils';
import { EditStudentModal } from '@/features/admin/edit-student-modal';
import { ProfileDTO } from '@/types/api';
import { StudentProgressOverview } from '@/features/admin/student-detail/StudentProgressOverview';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

interface StudentDetailDisplayProps {
  profile: ProfileDTO;
  onEdit: () => void;
  onResetPin: () => void;
  onDelete: () => void;
}

function StudentDetailDisplay({ profile, onEdit, onResetPin, onDelete }: StudentDetailDisplayProps) {
  const { copyToClipboard, copied } = useCopyToClipboard();

  const handleCopyId = async () => {
    await copyToClipboard(profile?.profileId ?? '');
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="pb-6">
        <div className="flex flex-col space-y-6">
          {/* Main Profile Section */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="flex-shrink-0">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white dark:border-gray-800 shadow-lg">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.fullName ?? 'Student'} />
                <AvatarFallback className="text-base sm:text-lg font-semibold bg-gradient-to-br from-primary/20 to-accent/20">
                  {getInitials(profile.fullName ?? 'S')}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-grow space-y-4 min-w-0">
              {/* Title Row */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-grow">
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px] cursor-pointer hover:text-primary transition-colors">
                          {profile.fullName || 'Student Profile'}
                        </CardTitle>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-w-sm">
                        <DropdownMenuItem className="flex items-center gap-2 p-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Full Name:</span>
                          <span className="ml-auto">{profile.fullName || 'Student Profile'}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="leading-relaxed text-sm">
                    Student Profile
                  </CardDescription>
                </div>
              </div>

              {/* Student ID - Mobile: Own line, Desktop: Inline */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <UserCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground font-medium flex-shrink-0">Student ID:</span>
                  <span className="font-mono font-semibold truncate max-w-[160px] sm:max-w-[200px] md:max-w-[300px]" title={profile?.profileId}>
                    {profile?.profileId}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyId}
                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-accent/50 flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-600 animate-in fade-in-0 zoom-in-95 duration-300" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Other Meta Information */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {profile.age && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Age:</span>
                    <span className="font-semibold">{profile.age}</span>
                  </div>
                )}
                
                {profile.readingLevel && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Level:</span>
                    <span className="font-semibold truncate max-w-[60px]" title={profile.readingLevel?.toString()}>
                      {profile.readingLevel}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-semibold">
                    {profile.createdAt ? format(new Date(profile.createdAt), 'MMM yyyy') : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 pt-4 border-t border-border/40">
                <Button variant="outline" size="icon" onClick={onEdit} title="Edit Student"> 
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={onResetPin} title="Reset PIN"> 
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={onDelete} title="Delete Student"> 
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
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

  const handleOpenResetPinDialog = () => {
    resetPinForm({ newPin: '' });
    setResetPinDialogOpen(true);
  };

  const handleCloseResetPinDialog = () => {
    setResetPinDialogOpen(false);
    resetPinForm({ newPin: '' });
  };

  const onResetPinSubmit = (data: ResetStudentPinInput) => {
    if (profile?.profileId) {
      resetPinMutation.mutate(
        { studentId: profile.profileId, newPin: data.newPin },
        {
          onSuccess: () => {
            handleCloseResetPinDialog();
          },
        }
      );
    }
  };

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
      });
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <Breadcrumb 
          role="ADMIN"
          items={[
            { label: 'Students', href: '/admin/students' },
            { label: profile?.fullName || 'Student' }
          ]}
        />

        {isLoading && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4" />
                <div className="flex-grow space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-md" />
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {isError && !isLoading && (
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
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
          <div className="mt-6">
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
                      autoFocus={false}
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
    </PageContainer>
  );
} 