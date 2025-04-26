'use client';

import React, { useState } from 'react';
import { useModuleVocabularyQuery } from '@/hooks/api/admin/modules/useModuleVocabularyQuery';
import { useDeleteVocabularyMutation } from '@/hooks/api/vocabulary/useDeleteVocabularyMutation'; // Import delete hook
// Import other vocab hooks: useAddVocabularyMutation, useUpdateVocabularyMutation
import type { Paragraph, VocabularyEntryDTO } from '@/types/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VocabularyFormModal } from './VocabularyFormModal'; // Import the modal
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import AlertDialog for delete confirmation

interface VocabularyManagementSectionProps {
    moduleId: string;
    paragraphs: Paragraph[]; // To know valid paragraph indices
}

export function VocabularyManagementSection({ moduleId, paragraphs }: VocabularyManagementSectionProps) {
    const { data: vocabulary = [], isLoading, error, refetch } = useModuleVocabularyQuery(moduleId);
    const { mutate: deleteMutate, isPending: isDeleting } = useDeleteVocabularyMutation(moduleId);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<VocabularyEntryDTO | null>(null);
    const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null); // State for delete confirmation

    const handleOpenAddModal = () => {
        setEditingEntry(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (entry: VocabularyEntryDTO) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEntry(null); // Clear editing state when modal closes
    };

    const handleDeleteClick = (entryId: string) => {
        setDeletingEntryId(entryId); // Open confirmation dialog
    };

    const confirmDelete = () => {
        if (deletingEntryId) {
            deleteMutate(deletingEntryId, {
                onSuccess: () => {
                    setDeletingEntryId(null); // Close confirmation dialog on success
                    // Refetch might be handled by invalidateQueries in the hook, but explicit refetch is safe
                    // refetch(); 
                },
                onError: () => {
                    setDeletingEntryId(null); // Close confirmation dialog even on error
                }
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="animate-spin h-4 w-4" />
                <span>Loading Vocabulary...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error Loading Vocabulary</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        );
    }

    const groupedVocabulary = vocabulary.reduce((acc, entry) => {
        const index = entry.paragraphIndex;
        if (!acc[index]) {
            acc[index] = [];
        }
        acc[index].push(entry);
        return acc;
    }, {} as Record<number, VocabularyEntryDTO[]>);

    return (
        <>
            <Card className="mt-6 border-dashed">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Vocabulary Management</CardTitle>
                            <CardDescription>Add, edit, or delete vocabulary words for each paragraph.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleOpenAddModal} disabled={paragraphs.length === 0 || isDeleting}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Vocabulary
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {paragraphs.length === 0 && (
                        <p className="text-sm text-muted-foreground">No paragraphs found in the module content. Add content first to manage vocabulary.</p>
                    )}
                    {paragraphs.map((paragraph) => (
                        <div key={paragraph.index} className="border p-4 rounded-md bg-background">
                            <h4 className="font-semibold mb-2">Paragraph {paragraph.index}</h4>
                            <ul className="space-y-2">
                                {(groupedVocabulary[paragraph.index] || []).map((entry) => (
                                    <li key={entry.id} className="flex justify-between items-center text-sm p-2 rounded hover:bg-muted/50">
                                        <div>
                                            <span className="font-medium">{entry.word}:</span>
                                            <span className="ml-2 text-muted-foreground">{entry.description}</span>
                                        </div>
                                        <div className="flex space-x-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditModal(entry)} disabled={isDeleting}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(entry.id)} disabled={isDeleting}>
                                                {isDeleting && deletingEntryId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                                {(!groupedVocabulary[paragraph.index] || groupedVocabulary[paragraph.index].length === 0) && (
                                    <p className="text-xs text-muted-foreground italic">No vocabulary defined for this paragraph.</p>
                                )}
                            </ul>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <VocabularyFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                moduleId={moduleId}
                initialData={editingEntry}
                paragraphs={paragraphs}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingEntryId} onOpenChange={(open) => !open && setDeletingEntryId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the vocabulary entry.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingEntryId(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
} 