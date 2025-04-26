'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateStudentSchema, UpdateStudentInput } from '@/lib/schemas/student';
import { useUpdateStudentMutation } from '@/hooks/api/admin/students/useUpdateStudentMutation';
import { ProfileDTO } from '@/types/api';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react'; 

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: ProfileDTO | null; // Pass the student data to pre-populate
}

export function EditStudentModal({ isOpen, onClose, student }: EditStudentModalProps) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isDirty }, // Check if form is dirty
    reset, // To reset form 
    setValue, // To set initial values
  } = useForm<UpdateStudentInput>({
    resolver: zodResolver(updateStudentSchema),
    // Default values are set in useEffect based on the student prop
  });

  const mutation = useUpdateStudentMutation();

  // Effect to populate form when student data is available or changes
  useEffect(() => {
    if (student) {
      reset({
        fullName: student.fullName ?? '',
        avatarUrl: student.avatarUrl ?? '',
      });
    } else {
        // Reset form if no student is provided (e.g., modal closed and reopened without data)
        reset({ fullName: '', avatarUrl: '' });
    }
  }, [student, reset]);

  const onSubmit = (data: UpdateStudentInput) => {
    if (!student?.id) {
        console.error("Student ID is missing, cannot update.");
        // Show error toast?
        return; 
    }
    
    // Only submit if the form is dirty (something changed)
    if (!isDirty) {
        onClose(); // Close modal if nothing changed
        return;
    }

    mutation.mutate(
      { profileId: student.id, data }, 
      {
        onSuccess: () => {
          // reset(); // Keep form data in case of quick reopen?
          onClose(); // Close the modal
          // Success toast handled by hook
        },
        onError: () => {
          // Error toast handled by hook
        }
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        // Reset form based on original student data when closing?
        reset({ 
            fullName: student?.fullName ?? '', 
            avatarUrl: student?.avatarUrl ?? '' 
        });
        onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Student Profile</DialogTitle>
          <DialogDescription>
            Make changes to {student?.fullName || 'the student'}'s profile.
          </DialogDescription>
        </DialogHeader>
        {/* Render form only if student data is loaded */}
        {student ? (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
            {mutation.error && (
                <Alert variant="destructive">
                <AlertTitle>Update Failed</AlertTitle>
                <AlertDescription>
                    {mutation.error.message || "An unexpected error occurred."} 
                </AlertDescription>
                </Alert>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">
                Full Name
              </Label>
              <Input 
                id="fullName" 
                {...register('fullName')} 
                className="col-span-3" 
                aria-invalid={errors.fullName ? "true" : "false"}
              />
              {errors.fullName && (
                <p className="col-span-4 text-sm text-red-600 text-right">{errors.fullName.message}</p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="avatarUrl" className="text-right">
                Avatar URL
              </Label>
              <Input 
                id="avatarUrl" 
                type="url"
                {...register('avatarUrl')} 
                className="col-span-3" 
                placeholder="https://example.com/avatar.png"
                aria-invalid={errors.avatarUrl ? "true" : "false"}
              />
              {errors.avatarUrl && (
                <p className="col-span-4 text-sm text-red-600 text-right">{errors.avatarUrl.message}</p>
              )}
            </div>
          </form>
        ) : (
             <div className="py-4 text-center text-muted-foreground">Loading student data...</div>
        )}
         <DialogFooter>
            <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
           {/* Ensure button is outside the form if form isn't always rendered */}
           <Button 
             type="submit" 
             onClick={handleSubmit(onSubmit)} 
             disabled={mutation.isPending || !student || !isDirty}
            >
             {mutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                'Save Changes'
              )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Placeholder feature component
export function AdminEditStudent({ studentId }: { studentId: string }) {
  console.log('AdminEditStudent feature rendered for studentId:', studentId);
  return <div>Admin Edit Student Feature Placeholder for {studentId}</div>;
} 