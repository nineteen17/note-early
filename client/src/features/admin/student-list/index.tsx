"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminStudentsQuery } from "@/hooks/api/admin/students/useAdminStudentsQuery";
import { useDeleteStudentMutation } from "@/hooks/api/admin/students/useDeleteStudentMutation";
import { useResetStudentPinMutation } from '@/hooks/api/admin/students/useResetStudentPinMutation';
import { resetStudentPinSchema, ResetStudentPinInput } from '@/lib/schemas/student';
import { ProfileDTO } from "@/types/api"; // Ensure this path is correct

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Trash2, KeyRound, Users } from "lucide-react"; // Or another icon for actions
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // For actions
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import Alert Dialog components
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

// Import the modal components
import { CreateStudentModal } from '@/features/admin/create-student-modal';
import { EditStudentModal } from '@/features/admin/edit-student-modal';

// TODO: Implement Edit/Delete Modals/Actions
// import { EditStudentModal } from '@/features/admin/edit-student-modal';
// import { useResetStudentPinMutation } from '@/hooks/api/admin/students/useResetStudentPinMutation';

export function AdminStudentList() {
  const { data: students, isLoading, error, isError } = useAdminStudentsQuery();
  const deleteMutation = useDeleteStudentMutation();
  const resetPinMutation = useResetStudentPinMutation();
  console.log("get students = ", students);
  
  // State for controlling the create modal
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ProfileDTO | null>(null);
  // State for delete confirmation
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDeleteId, setStudentToDeleteId] = useState<string | null>(null);
  // State for reset PIN confirmation
  const [isResetPinDialogOpen, setResetPinDialogOpen] = useState(false);
  const [studentToResetPinId, setStudentToResetPinId] = useState<string | null>(null);

  // Form for reset PIN dialog
  const { 
    handleSubmit,
    control,
    formState: { errors: resetPinErrors },
    reset: resetPinForm,
  } = useForm<ResetStudentPinInput>({
    resolver: zodResolver(resetStudentPinSchema),
    defaultValues: { newPin: '' },
  });

  const handleAddStudent = () => {
    setCreateModalOpen(true); // Open the modal
    // console.log("Add Student clicked - Implement Modal");
  };

  const handleEditStudent = (student: ProfileDTO) => {
    setEditingStudent(student);
    setEditModalOpen(true);
    // console.log(`Edit Student clicked: ${student.id} - Implement Modal`);
  };

  // Close handler for edit modal (resets editing student)
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingStudent(null);
  };

  // Open delete confirmation dialog
  const handleDeleteStudent = (studentId: string) => {
    setStudentToDeleteId(studentId);
    setDeleteDialogOpen(true);
    // console.log(`Delete Student clicked: ${studentId} - Implement Action`);
  };

  // Confirm deletion and call mutation
  const confirmDeleteStudent = () => {
    if (studentToDeleteId) {
      deleteMutation.mutate(studentToDeleteId, {
        onSettled: () => {
          // Close dialog regardless of success/error (handled by toasts)
          setDeleteDialogOpen(false);
          setStudentToDeleteId(null);
        }
      });
    }
  };

  const handleResetPin = (studentId: string) => {
    setStudentToResetPinId(studentId);
    resetPinForm({ newPin: '' });
    setResetPinDialogOpen(true);
  };

  // Handle Reset PIN form submission
  const onResetPinSubmit = (data: ResetStudentPinInput) => {
    if (studentToResetPinId) {
      resetPinMutation.mutate(
        { studentId: studentToResetPinId, newPin: data.newPin },
        {
          onSettled: () => {
            setResetPinDialogOpen(false);
            setStudentToResetPinId(null);
            resetPinForm({ newPin: '' });
          }
        }
      );
    }
  };

  // Helper to format date, could be moved to a utils file
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Find student name for dialog titles
  const studentToDeleteName = students?.find(s => s.profileId === studentToDeleteId)?.fullName;
  const studentToResetPinName = students?.find(s => s.profileId === studentToResetPinId)?.fullName;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-semibold">Students</h1>
           <p className="text-muted-foreground">
             Manage student profiles and track their progress.
           </p>
        </div>
        <Button onClick={handleAddStudent}>Add Student</Button>
      </div>

      {/* Error Alert (Keep outside Card) */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error?.message || "Failed to load students."}
          </AlertDescription>
        </Alert>
      )}

      <Card>
         <CardContent className="pt-6">
          {/* Conditional Rendering based on state */}
          {isLoading ? (
            // Loading State: Render Skeletons within Table structure
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead className="w-[300px]">Student ID</TableHead>
                  <TableHead className="w-[120px]">Joined</TableHead>
                  <TableHead className="w-[160px]">Completed Modules</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[280px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                       <Skeleton className="h-4 w-[140px]" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : students && students.length > 0 ? (
             // Data State: Render the actual table
            <Table>
              <TableHeader>
                 <TableRow>
                   <TableHead className="w-[250px]">Name</TableHead>
                   <TableHead className="w-[300px]">Student ID</TableHead>
                   <TableHead className="w-[120px]">Joined</TableHead>
                   <TableHead className="w-[160px]">Completed Modules</TableHead>
                   <TableHead className="text-right w-[80px]">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {students.map((student) => (
                   <TableRow key={student.profileId }>
                     <TableCell>
                       <div className="flex items-center gap-3">
                         <Avatar className="h-10 w-10">
                           <AvatarImage src={student.avatarUrl ?? undefined} alt={student.fullName ?? 'Student'} />
                           <AvatarFallback>{getInitials(student.fullName)}</AvatarFallback>
                         </Avatar>
                         <span className="font-medium">{student.fullName || "N/A"}</span>
                       </div>
                     </TableCell>
                     <TableCell className="text-muted-foreground font-mono text-xs">{student.profileId}</TableCell>
                     <TableCell className="text-muted-foreground">
                       {formatDate(student.createdAt)}
                     </TableCell>
                     <TableCell className="text-center">
                       {student.completedModulesCount ?? 0}
                     </TableCell>
                     <TableCell className="text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" className="h-8 w-8 p-0">
                             <span className="sr-only">Open menu</span>
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                             Edit Profile
                           </DropdownMenuItem>
                            <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => handleResetPin(student.profileId)}>
                              <KeyRound className="mr-2 h-4 w-4" /> Reset PIN
                           </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => handleDeleteStudent(student.profileId)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                             Delete Student
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
            </Table>
          ) : (
            // Empty State: Render a message
            <div className="flex flex-col items-center justify-center py-20 text-center">
               <Users className="h-16 w-16 text-muted-foreground mb-4" /> 
              <h3 className="text-xl font-semibold mb-2">No Students Found</h3>
              <p className="text-muted-foreground">
                Click the "Add Student" button above to create the first student profile.
              </p>
            </div>
          )}
         </CardContent>
      </Card>

      {/* Render the CreateStudentModal, controlled by state */}
      <CreateStudentModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />

      <EditStudentModal 
        isOpen={isEditModalOpen} 
        onClose={handleCloseEditModal} 
        student={editingStudent} 
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {studentToDeleteName || 'Student'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student's profile
              and all associated data (progress, summaries, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteStudent} 
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
             >
              {deleteMutation.isPending ? "Deleting..." : "Yes, delete student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset PIN Dialog with Form */}
      <AlertDialog open={isResetPinDialogOpen} onOpenChange={(open) => { if (!open) { setStudentToResetPinId(null); resetPinForm(); } setResetPinDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset PIN for {studentToResetPinName || 'Student'}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new 4-digit PIN for the student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit(onResetPinSubmit)} id="reset-pin-form" className="space-y-4 py-2">
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
            <AlertDialogCancel onClick={() => { setStudentToResetPinId(null); resetPinForm(); }}>Cancel</AlertDialogCancel>
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

      {/* TODO: Render Edit Modal based on state */}
      {/* {isEditModalOpen && editingStudent && <EditStudentModal isOpen={isEditModalOpen} student={editingStudent} onClose={() => setEditModalOpen(false)} />} */}
    </>
  );
} 