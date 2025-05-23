'use client';

import React, { useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';

import { adminUpdateProgressSchema, type AdminUpdateProgressFormInput } from '@/lib/schemas/progress';
import type { StudentProgressSchema } from '@/types/api';
import { useAdminUpdateProgressMutation } from '@/hooks/api/admin/progress/useAdminUpdateProgressMutation';

interface AdminUpdateProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    progressRecord: StudentProgressSchema;
    // moduleId: string; // Module ID might not be directly needed here, but could be useful for invalidation
}

export function AdminUpdateProgressModal({
    isOpen,
    onClose,
    progressRecord,
    // moduleId, // Remove if not used directly
}: AdminUpdateProgressModalProps) {

    // Remove moduleId argument from hook call
    const { mutate: updateProgressMutate, isPending: isUpdating } = useAdminUpdateProgressMutation();

    const { control, handleSubmit, register, reset, formState: { errors, isSubmitting, dirtyFields } } = useForm<AdminUpdateProgressFormInput>({
        resolver: zodResolver(adminUpdateProgressSchema),
        defaultValues: {
            score: null,
            teacherFeedback: null,
            completed: false,
        }
    });

    // Reset form when the modal opens or the progressRecord changes
    useEffect(() => {
        if (isOpen && progressRecord) {
            reset({
                score: progressRecord.score ?? null,
                teacherFeedback: progressRecord.teacherFeedback ?? null,
                completed: progressRecord.completed,
            });
        } 
        // If the modal closes, the form doesn't strictly need resetting
        // unless you want it cleared for the next time it might open *without* new initial data.
    }, [isOpen, progressRecord, reset]);

    const onSubmit: SubmitHandler<AdminUpdateProgressFormInput> = (data) => {
        // Determine only the changed fields to send in PATCH
        const changedData: Partial<AdminUpdateProgressFormInput> = {};
        let hasChanges = false;

        (Object.keys(dirtyFields) as Array<keyof AdminUpdateProgressFormInput>).forEach(key => {
            if (dirtyFields[key]) {
                 // Handle potential null/undefined transformations if necessary, but direct assignment is often fine for PATCH
                 (changedData as any)[key] = data[key];
                 hasChanges = true;
            }
        });

        if (!hasChanges) {
            // Maybe show a toast? Or just close?
            console.log("No changes detected.");
            onClose();
            return;
        }

        updateProgressMutate(
            { progressId: progressRecord.id, data: changedData as AdminUpdateProgressFormInput },
            {
                onSuccess: () => onClose(), // Close modal on success
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Progress</DialogTitle>
                    <DialogDescription>
                        Update score, feedback, and completion status for this record.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    {/* Score Input */}
                    <div className="space-y-1">
                        <Label htmlFor="score">Score (0-100)</Label>
                        <Controller
                            name="score"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="score"
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="Optional score"
                                    {...field}
                                    value={field.value ?? ''} // Handle null for input display
                                    onChange={e => {
                                        const value = e.target.value;
                                        field.onChange(value === '' ? null : Number(value)); // Convert back to number or null
                                    }}
                                />
                            )}
                        />
                        {errors.score && <p className="text-sm text-red-600">{errors.score.message}</p>}
                    </div>

                    {/* Teacher Feedback Textarea */}
                    <div className="space-y-1">
                        <Label htmlFor="teacherFeedback">Feedback (Optional)</Label>
                        <Textarea
                            id="teacherFeedback"
                            placeholder="Provide feedback to the student..."
                            {...register("teacherFeedback")}
                        />
                        {errors.teacherFeedback && <p className="text-sm text-red-600">{errors.teacherFeedback.message}</p>}
                    </div>

                    {/* Completed Switch */}
                    <div className="flex items-center space-x-2 pt-2">
                        <Controller
                            name="completed"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="completed"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                        <Label htmlFor="completed">Mark as Completed</Label>
                        {errors.completed && <p className="text-sm text-red-600">{errors.completed.message}</p>}
                    </div>

                    <DialogFooter>
                         <DialogClose asChild>
                             <Button type="button" variant="outline" disabled={isUpdating}>
                                 Cancel
                             </Button>
                         </DialogClose>
                        <Button type="submit" disabled={!Object.keys(dirtyFields).length || isUpdating || isSubmitting}>
                            {isUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 