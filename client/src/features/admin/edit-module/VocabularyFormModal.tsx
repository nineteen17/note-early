'use client';

import React, { useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

import { vocabularyFormSchema, type VocabularyFormInput } from '@/lib/schemas/vocabulary';
import type { VocabularyEntryDTO, Paragraph } from '@/types/api';
import { useAddVocabularyMutation } from '@/hooks/api/admin/modules/useAddVocabularyMutation';
import { useUpdateVocabularyMutation } from '@/hooks/api/vocabulary/useUpdateVocabularyMutation';

interface VocabularyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    moduleId: string;
    initialData?: VocabularyEntryDTO | null; // Null for add, existing entry for edit
    paragraphs: Paragraph[]; // To populate the paragraph index select
}

export function VocabularyFormModal({
    isOpen,
    onClose,
    moduleId,
    initialData,
    paragraphs
}: VocabularyFormModalProps) {

    const isEditMode = !!initialData;

    // Instantiate Add and Update mutation hooks
    const { mutate: addMutate, isPending: isAdding } = useAddVocabularyMutation(moduleId);
    const { mutate: updateMutate, isPending: isUpdating } = useUpdateVocabularyMutation(moduleId);

    const { control, handleSubmit, register, reset, formState: { errors, isSubmitting } } = useForm<VocabularyFormInput>({
        resolver: zodResolver(vocabularyFormSchema),
        defaultValues: {
            paragraphIndex: paragraphs.length > 0 ? paragraphs[0].index : 1,
            word: '',
            description: '',
        }
    });

    // Reset form when initialData changes or modal opens/closes
    useEffect(() => {
        if (isOpen) { // Only reset when modal becomes visible or data changes
            if (isEditMode && initialData) {
                reset({
                    paragraphIndex: initialData.paragraphIndex,
                    word: initialData.word,
                    description: initialData.description,
                });
            } else {
                // Reset to default for add mode
                reset({
                    paragraphIndex: paragraphs.length > 0 ? paragraphs[0].index : 1,
                    word: '',
                    description: '',
                });
            }
        } 
        // Dependency array includes isOpen to trigger reset on open/close
    }, [initialData, isEditMode, reset, paragraphs, isOpen]);

    const onSubmit: SubmitHandler<VocabularyFormInput> = (data) => {
        const mutationOptions = {
            onSuccess: () => onClose(), // Close modal on success
            // onError is handled globally by the hook (shows toast)
        };

        if (isEditMode && initialData) {
            updateMutate({ vocabularyId: initialData.id, data }, mutationOptions);
        } else {
            addMutate(data, mutationOptions);
        }
    };

    // Combine loading states
    const isProcessing = isAdding || isUpdating;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}> 
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit' : 'Add'} Vocabulary Entry</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Update the details for this vocabulary word.' : 'Add a new vocabulary word for a specific paragraph.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    {/* Paragraph Index Select */}
                    <div className="space-y-1">
                        <Label htmlFor="paragraphIndex">Paragraph</Label>
                        <Controller
                            name="paragraphIndex"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    onValueChange={(value) => field.onChange(Number(value))}
                                    value={field.value?.toString()}
                                    disabled={paragraphs.length === 0}
                                >
                                    <SelectTrigger id="paragraphIndex">
                                        <SelectValue placeholder="Select paragraph" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paragraphs.map((p) => (
                                            <SelectItem key={p.index} value={p.index.toString()}>
                                                Paragraph {p.index}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.paragraphIndex && <p className="text-sm text-red-600">{errors.paragraphIndex.message}</p>}
                    </div>

                    {/* Word Input */}
                    <div className="space-y-1">
                        <Label htmlFor="word">Word</Label>
                        <Input
                            id="word"
                            {...register("word")}
                            aria-invalid={errors.word ? "true" : "false"}
                        />
                        {errors.word && <p className="text-sm text-red-600">{errors.word.message}</p>}
                    </div>

                    {/* Description Textarea */}
                    <div className="space-y-1">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            {...register("description")}
                            aria-invalid={errors.description ? "true" : "false"}
                        />
                        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
                    </div>

                    <DialogFooter>
                         <DialogClose asChild>
                             <Button type="button" variant="outline" disabled={isProcessing}>
                                 Cancel
                             </Button>
                         </DialogClose>
                        <Button type="submit" disabled={isProcessing || isSubmitting}>
                            {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            {isEditMode ? 'Save Changes' : 'Add Entry'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 