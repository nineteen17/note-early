'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller, SubmitHandler, type Resolver, useFieldArray } from 'react-hook-form';

import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,

} from "@/components/ui/dialog";

import { 
    Loader2, 
    Plus, 
    Trash2, 
    ChevronLeft,
    ChevronRight,

    Save,
    Edit3,
    FileText,
    Settings,
    AlertCircle,
    BookOpen,
    Clock,
    User,
    Globe,
    Tag,
    Image,

} from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
import { useUpdateModuleMutation } from '@/hooks/api/admin/modules/useUpdateModuleMutation';
import { updateModuleSchema, UpdateModuleInput, levelOptions, genreOptions, languageOptions, ReadingModule } from '@/lib/schemas/modules';

import { useDeleteVocabularyMutation } from '@/hooks/api/vocabulary/useDeleteVocabularyMutation';
import { useAuthStore } from '@/store/authStore';
import { cn, getModuleTypeDisplayName } from '@/lib/utils';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { PageContainer } from '@/components/layout/PageContainer';
import { useParagraphVocabularyQuery } from '@/hooks/api/reading-modules';
import { useAddVocabularyMutation } from '@/hooks/api/admin/modules/useAddVocabularyMutation';

interface AdminEditModuleFeatureProps {
    moduleId: string;
}



export function AdminEditModuleFeature({ moduleId }: AdminEditModuleFeatureProps) {
    const { profile } = useAuthStore();

    const { data: moduleData, isLoading: isLoadingModule, error: moduleError } = useModuleQuery(moduleId);

    const { mutate: updateModuleMutateFn, isPending: isUpdating, error: updateError } = useUpdateModuleMutation(moduleId);
    const { mutate: deleteVocabularyMutate } = useDeleteVocabularyMutation(moduleId);
    const { mutate: addVocabularyMutate, isPending: isAddingVocab } = useAddVocabularyMutation(moduleId);

    // State for UI control
    const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isViewMode, setIsViewMode] = useState(true);
    const [newVocabWord, setNewVocabWord] = useState('');
    const [newVocabDescription, setNewVocabDescription] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [paragraphToDelete, setParagraphToDelete] = useState<number | null>(null);
    const [showAddVocabDialog, setShowAddVocabDialog] = useState(false);


    // Check permissions
    const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
    const isCustomModule = moduleData?.type === 'custom';
    const isCuratedModule = moduleData?.type === 'curated';
    // Custom modules should be editable by admins, curated modules only by super admins
    const canEdit = isCustomModule || (isCuratedModule && isSuperAdmin);

    // Settings dialog should be read-only if user can't edit the module
    const isSettingsReadOnly = !canEdit;

    const {
        control,
        handleSubmit,
        register,
        reset,
        formState: { errors, dirtyFields },
        watch,
    } = useForm<UpdateModuleInput>({
        resolver: zodResolver(updateModuleSchema) as Resolver<UpdateModuleInput>,
        defaultValues: {
            title: '',
            description: '',
            level: 1,
            genre: 'Adventure',
            language: 'UK',
            imageUrl: '',
            estimatedReadingTime: null,
            authorFirstName: '',
            authorLastName: '',
            isActive: true,
            structuredContent: [{ index: 1, text: '' }],
        },
    });

    const { fields: paragraphFields, append: appendParagraph, remove: removeParagraph } = useFieldArray({
        control,
        name: "structuredContent",
        keyName: "id",
    });

    // Get vocabulary for current paragraph - use the actual paragraph index, not array index
    const currentParagraphIndex = paragraphFields[currentStep]?.index || currentStep + 1;
    const { data: currentParagraphVocab = [], isLoading: isLoadingVocab } = useParagraphVocabularyQuery(moduleId, currentParagraphIndex);



    // Reset form when module data loads
    useEffect(() => {
        if (moduleData) {
            const structuredContent = moduleData.structuredContent && moduleData.structuredContent.length > 0
                ? moduleData.structuredContent.map(p => ({ index: p.index, text: p.text }))
                : [{ index: 1, text: '' }];
                
            reset({
                title: moduleData.title,
                description: moduleData.description ?? '',
                level: moduleData.level,
                genre: moduleData.genre,
                language: moduleData.language,
                imageUrl: moduleData.imageUrl ?? '',
                estimatedReadingTime: moduleData.estimatedReadingTime ?? null,
                authorFirstName: moduleData.authorFirstName ?? '',
                authorLastName: moduleData.authorLastName ?? '',
                isActive: moduleData.isActive,
                structuredContent: structuredContent,
            }, { keepDirty: false });
            
            // Always default to view mode regardless of module type
            setIsViewMode(true);
            
            // Don't reset currentStep - preserve user's current position
        }
    }, [moduleData, reset]);

    // Handle page refresh and navigation - warn user if in edit mode
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!isViewMode) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return 'You have unsaved changes. Are you sure you want to leave?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isViewMode]);

    // Ensure currentStep stays within bounds when paragraphs change
    useEffect(() => {
        if (paragraphFields.length > 0 && currentStep >= paragraphFields.length) {
            setCurrentStep(paragraphFields.length - 1);
        }
    }, [paragraphFields.length, currentStep]);

    const toggleEditMode = () => {
        if (!canEdit) {
            toast.error(isCuratedModule 
                ? "Only Super Admins can edit curated modules" 
                : "You don't have permission to edit this module"
            );
            return;
        }
        
        // Simply toggle edit mode without resetting the form
        // This preserves any newly added paragraphs or changes
        setIsViewMode(!isViewMode);
    };

    const onSubmit: SubmitHandler<UpdateModuleInput> = (data) => {
        if (isViewMode) return;

        const changedData: Partial<UpdateModuleInput> = {};
        let hasChanges = false;
        
        (Object.keys(dirtyFields) as Array<keyof UpdateModuleInput>).forEach((key) => {
            if (key === 'estimatedReadingTime') {
                const originalValue = moduleData?.estimatedReadingTime ?? null;
                const currentValue = data[key] ? Number(data[key]) : null;
                if (currentValue !== originalValue) {
                    changedData[key] = currentValue;
                    hasChanges = true;
                }
            } else if (key === 'structuredContent') {
                if (dirtyFields[key]) {
                     changedData[key] = data[key];
                     hasChanges = true;
                }
            } else if (dirtyFields[key]) {
                (changedData as Record<string, any>)[key] = data[key];
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            toast.info("No changes detected to save.");
            return;
        }

        updateModuleMutateFn(changedData, {
            onSuccess: (updatedModule: ReadingModule) => {
                toast.success(`Module "${updatedModule.title}" updated successfully!`);
                reset(updatedModule, { keepDirty: false });
                setIsModuleDialogOpen(false); // Close dialog on success
                setIsViewMode(true); // Return to view mode after successful save
            },
            onError: (error) => {
                console.error("Update failed from component callback:", error);
            },
        });
    };

    const addNewParagraph = () => {
        const nextIndex = paragraphFields.length + 1;
        const newParagraphIndex = paragraphFields.length; // Index where the new paragraph will be added
        
        appendParagraph({ index: nextIndex, text: '' });
        
        // Navigate to the new paragraph immediately
        setCurrentStep(newParagraphIndex);
        
        // Show a toast reminding user to save
        toast.info("Remember to save the module before adding vocabulary to new paragraphs");
    };

    const handleDeleteClick = (indexToRemove: number) => {
        setParagraphToDelete(indexToRemove);
        setShowDeleteDialog(true);
    };

    const confirmDeleteParagraph = () => {
        if (paragraphToDelete !== null) {
            exitEditMode(); // Exit edit mode when deleting paragraphs
            
            removeParagraph(paragraphToDelete);
            
            // Adjust current step if needed
            if (currentStep >= paragraphFields.length - 1) {
                setCurrentStep(Math.max(0, currentStep - 1));
            }
            
            setShowDeleteDialog(false);
            setParagraphToDelete(null);
            toast.success('Paragraph deleted successfully');
        }
    };

    const cancelDelete = () => {
        setShowDeleteDialog(false);
        setParagraphToDelete(null);
    };

    const exitEditMode = () => {
        if (!isViewMode) {
            // Reset form to original data when canceling
            if (moduleData) {
                const structuredContent = moduleData.structuredContent && moduleData.structuredContent.length > 0
                    ? moduleData.structuredContent.map(p => ({ index: p.index, text: p.text }))
                    : [{ index: 1, text: '' }];
                    
                reset({
                    title: moduleData.title,
                    description: moduleData.description ?? '',
                    level: moduleData.level,
                    genre: moduleData.genre,
                    language: moduleData.language,
                    imageUrl: moduleData.imageUrl ?? '',
                    estimatedReadingTime: moduleData.estimatedReadingTime ?? null,
                    authorFirstName: moduleData.authorFirstName ?? '',
                    authorLastName: moduleData.authorLastName ?? '',
                    isActive: moduleData.isActive,
                    structuredContent: structuredContent,
                }, { keepDirty: false });
            }
            setIsViewMode(true);
        }
    };

    const nextStep = () => {
        if (currentStep < paragraphFields.length - 1) {
            exitEditMode(); // Exit edit mode when changing paragraphs
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            exitEditMode(); // Exit edit mode when changing paragraphs
            setCurrentStep(currentStep - 1);
        }
    };

    const goToStep = (step: number) => {
        exitEditMode(); // Exit edit mode when changing paragraphs
        setCurrentStep(step);
    };

    const handleAddVocabulary = () => {
        if (!newVocabWord.trim() || !newVocabDescription.trim()) {
            toast.error("Please fill in both word and description");
            return;
        }

        // Check if this is a new paragraph that hasn't been saved yet
        const isNewParagraph = currentParagraphIndex > (moduleData?.structuredContent?.length || 0);
        if (isNewParagraph) {
            toast.error("Please save the module first before adding vocabulary to new paragraphs");
            return;
        }

        // Debug logging to track paragraph index issues
        console.log("Adding vocabulary:", {
            currentStep,
            currentParagraphIndex,
            paragraphFields: paragraphFields.map((p, i) => ({ arrayIndex: i, paragraphIndex: p.index })),
            currentParagraph: paragraphFields[currentStep],
            moduleStructuredContentLength: moduleData?.structuredContent?.length,
            isNewParagraph
        });

        exitEditMode(); // Exit edit mode when performing other actions

        addVocabularyMutate({
            paragraphIndex: currentParagraphIndex,
            word: newVocabWord.trim(),
            description: newVocabDescription.trim()
        }, {
            onSuccess: () => {
                toast.success("Vocabulary added successfully");
                setNewVocabWord('');
                setNewVocabDescription('');
                setShowAddVocabDialog(false);
            },
            onError: (error) => {
                console.error("Vocabulary add error:", error);
                toast.error(error.message || "Failed to add vocabulary");
            }
        });
    };

    const [vocabToDelete, setVocabToDelete] = useState<{id: string, word: string} | null>(null);
    const [showVocabDeleteDialog, setShowVocabDeleteDialog] = useState(false);

    const handleDeleteVocabulary = (vocabId: string, word: string) => {
        setVocabToDelete({id: vocabId, word});
        setShowVocabDeleteDialog(true);
    };

    const confirmDeleteVocabulary = () => {
        if (vocabToDelete) {
            exitEditMode(); // Exit edit mode when performing other actions
            
            deleteVocabularyMutate(vocabToDelete.id, {
                onSuccess: () => {
                    toast.success("Vocabulary deleted successfully");
                    setShowVocabDeleteDialog(false);
                    setVocabToDelete(null);
                },
                onError: (error) => {
                    toast.error(error.message || "Failed to delete vocabulary");
                }
            });
        }
    };

    const cancelVocabDelete = () => {
        setShowVocabDeleteDialog(false);
        setVocabToDelete(null);
    };

    if (isLoadingModule) {
        return (
            <PageContainer>
                <div className="space-y-6">
                    {/* Breadcrumb Skeleton */}
                    <div className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
            </div>

                    {/* Header Card Skeleton */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-6">
                            <div className="space-y-4">
                                {/* Title and Status Row */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-64" />
                                        <Skeleton className="h-4 w-96" />
                                    </div>
                                    <Skeleton className="h-6 w-16" />
                                </div>

                                {/* Meta Information Skeleton */}
                                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/40">
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-5 w-28" />
                                </div>

                                {/* Action Controls Skeleton */}
                                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-8 w-20" />
                                        <Skeleton className="h-8 w-24" />
                                    </div>
                                    <Skeleton className="h-8 w-20" />
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Main Content Skeleton */}
                    <Card className="shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-6 w-32" />
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-8 w-8" />
                                        <Skeleton className="h-8 w-8" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-20" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </div>
                            
                            {/* Navigation Buttons Skeleton */}
                            <div className="flex justify-center pt-4">
                                <div className="flex items-center gap-2">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="w-12 h-12 rounded-xl" />
                                    ))}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-8 p-8">
                            {/* Content Editor Skeleton */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-lg" />
                                    <Skeleton className="h-6 w-32" />
                                </div>
                                <Skeleton className="h-64 w-full rounded-xl" />
                            </div>

                            {/* Vocabulary Section Skeleton */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-lg" />
                                        <Skeleton className="h-6 w-32" />
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </div>
                                    <Skeleton className="h-8 w-24" />
                                </div>
                                
                                {/* Vocabulary Items Skeleton */}
                                <div className="grid gap-4">
                                    {[...Array(2)].map((_, i) => (
                                        <div key={i} className="p-6 rounded-xl border-2 border-accent/20">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0 flex-1 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-5 w-8 rounded-full" />
                                                        <Skeleton className="h-6 w-24" />
                                                    </div>
                                                    <Skeleton className="h-4 w-full" />
                                                    <Skeleton className="h-4 w-3/4" />
                                                </div>
                                                <Skeleton className="h-8 w-8" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </PageContainer>
        );
    }

    if (moduleError || !moduleData) {
        return (
            <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Module</AlertTitle>
                <AlertDescription>
                    Failed to load module data. {moduleError?.message}
                </AlertDescription>
            </Alert>
        );
    }

    const currentParagraph = paragraphFields[currentStep] || { index: currentStep + 1, text: '' };

    return (
        <PageContainer>
            <div className="space-y-6">
                {/* Enhanced Breadcrumb */}
                <Breadcrumb 
                    role={profile?.role}
                    items={[
                        { label: "Modules", href: "/admin/modules" },
                        { label: moduleData.title, href: `/admin/modules/${moduleId}` },
                    ]}
                />

                {/* Enhanced Header Card */}
                <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                    <CardHeader className="pb-6">
                        <div className="flex flex-col space-y-4">
                            {/* Title and Status Row */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="text-2xl font-bold tracking-tight">
                                            {moduleData.title}
                                        </CardTitle>
                                    </div>
                                    {moduleData.description && (
                                        <p className="text-muted-foreground max-w-2xl leading-relaxed">
                                            {moduleData.description}
                                        </p>
                                    )}
                                </div>
                                
                                {/* Status Badge */}
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
                                        moduleData.isActive 
                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                    )}>
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full mr-2",
                                            moduleData.isActive ? "bg-green-500" : "bg-red-500"
                                        )} />
                                        {moduleData.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            {/* Enhanced Meta Information */}
                            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/40">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Tag className="h-4 w-4" />
                                    <span className={cn(
                                        "px-2 py-1 rounded-md text-xs font-medium",
                                        isCuratedModule 
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                    )}>
                                        {getModuleTypeDisplayName(moduleData.type)}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Globe className="h-4 w-4" />
                                    <span>Level {moduleData.level}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <BookOpen className="h-4 w-4" />
                                    <span>{moduleData.genre}</span>
                                </div>
                                
                                {moduleData.estimatedReadingTime && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>{moduleData.estimatedReadingTime} min read</span>
                                    </div>
                                )}
                                
                                {(moduleData.authorFirstName || moduleData.authorLastName) && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <User className="h-4 w-4" />
                                        <span>
                                            {[moduleData.authorFirstName, moduleData.authorLastName]
                                                .filter(Boolean)
                                                .join(' ')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Action Controls */}
                            <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium",
                                        !canEdit
                                            ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                                            : isViewMode
                                                ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                                                : "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800"
                                    )}>
                                        <div className={cn(
                                            "w-2 h-2 rounded-full mr-2",
                                            !canEdit ? "bg-red-500" : isViewMode ? "bg-green-500" : "bg-orange-500"
                                        )} />
                                        {!canEdit ? "Read Only" : "Editable"}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {/* Settings Button - Always visible */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            exitEditMode(); // Exit edit mode when opening settings
                                            setIsModuleDialogOpen(true);
                                        }}
                                        className="border-dashed"
                                    >
                                        <Settings className="h-4 w-4 sm:mr-2" />
                                        <span className="hidden sm:inline">Settings</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
            </CardHeader>
                </Card>

                {/* Enhanced Module Settings Dialog */}
                <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
                    <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
                        <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)}>
                            <DialogHeader className="pb-6 border-b">
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <Settings className="h-5 w-5" />
                                    Module Settings
                                </DialogTitle>
                                <DialogDescription>
                                    Configure module metadata, properties, and content settings
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-8 py-6">
                                {/* Title & Description Section */}
                                <div className="space-y-6">
                                    <h4 className="text-lg font-semibold flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Content Information
                                    </h4>
                                    
                                    <div className="grid gap-6">
                    <div className="space-y-2">
                                            <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                                                <BookOpen className="h-4 w-4" />
                                                Module Title
                                            </Label>
                                            {isSettingsReadOnly ? (
                                                <div className="min-h-11 px-4 py-3 border rounded-lg bg-muted/30 flex items-center">
                                                    {moduleData.title}
                                                </div>
                                            ) : (
                        <Input
                            id="title"
                                                    {...register('title')}
                                                    placeholder="Enter module title"
                                                    className={cn(
                                                        "h-11",
                                                        errors.title ? 'border-destructive focus-visible:ring-destructive' : ''
                                                    )}
                                                    autoFocus={false}
                                                />
                                            )}
                                            {errors.title && (
                                                <p className="text-sm text-destructive flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    {errors.title.message}
                                                </p>
                                            )}
                    </div>

                    <div className="space-y-2">
                                            <Label htmlFor="description" className="text-sm font-medium">
                                                Description
                                            </Label>
                                            {isSettingsReadOnly ? (
                                                <div className="min-h-24 px-4 py-3 border rounded-lg bg-muted/30">
                                                    {moduleData.description || (
                                                        <span className="text-muted-foreground italic">No description provided</span>
                                                    )}
                                                </div>
                                            ) : (
                        <Textarea
                            id="description"
                                                    {...register('description')}
                                                    placeholder="Enter module description"
                                                    rows={4}
                                                    className="resize-none"
                                                    autoFocus={false}
                        />
                                            )}
                                        </div>
                                    </div>
                    </div>

                                {/* Content Properties Section */}
                                <div className="space-y-6">
                                    <h4 className="text-lg font-semibold flex items-center gap-2">
                                        <Tag className="h-5 w-5" />
                                        Content Properties
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Reading Level</Label>
                                            {isSettingsReadOnly ? (
                                                <div className="min-h-11 px-4 py-3 border rounded-lg bg-muted/30 flex items-center">
                                                    Level {moduleData.level}
                                                </div>
                                            ) : (
                            <Controller
                                name="level"
                                control={control}
                                render={({ field }) => (
                                                        <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                                                            <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {levelOptions.map((level) => (
                                                <SelectItem key={level} value={level.toString()}>
                                                                        Level {level}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                                            )}
                        </div>

                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Genre</Label>
                                            {isSettingsReadOnly ? (
                                                <div className="min-h-11 px-4 py-3 border rounded-lg bg-muted/30 flex items-center">
                                                    {moduleData.genre}
                                                </div>
                                            ) : (
                            <Controller
                                name="genre"
                                control={control}
                                render={({ field }) => (
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select genre" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {genreOptions.map((genre) => (
                                                <SelectItem key={genre} value={genre}>
                                                    {genre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                                            )}
                        </div>

                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Language</Label>
                                            {isSettingsReadOnly ? (
                                                <div className="min-h-11 px-4 py-3 border rounded-lg bg-muted/30 flex items-center">
                                                    {moduleData.language === 'UK' ? 'British English' : 'American English'}
                                                </div>
                                            ) : (
                            <Controller
                                name="language"
                                control={control}
                                render={({ field }) => (
                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                            <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {languageOptions.map((lang) => (
                                                <SelectItem key={lang} value={lang}>
                                                                        {lang === 'UK' ? 'British English' : 'American English'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                                            )}
                                        </div>
                        </div>
                    </div>

                                {/* Author & Media Section */}
                                <div className="space-y-6">
                                    <h4 className="text-lg font-semibold flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Author & Media
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                                            <Label className="text-sm font-medium">Author First Name</Label>
                                            {isSettingsReadOnly ? (
                                                <div className="min-h-11 px-4 py-3 border rounded-lg bg-muted/30 flex items-center">
                                                    {moduleData.authorFirstName || (
                                                        <span className="text-muted-foreground italic">Not specified</span>
                                                    )}
                                                </div>
                                            ) : (
                        <Input
                                                    {...register('authorFirstName')}
                                                    placeholder="Author's first name"
                                                    className="h-11"
                                                    autoFocus={false}
                                                />
                                            )}
                    </div>

                    <div className="space-y-2">
                                            <Label className="text-sm font-medium">Author Last Name</Label>
                                            {isSettingsReadOnly ? (
                                                <div className="min-h-11 px-4 py-3 border rounded-lg bg-muted/30 flex items-center">
                                                    {moduleData.authorLastName || (
                                                        <span className="text-muted-foreground italic">Not specified</span>
                                                    )}
                                                </div>
                                            ) : (
                                <Input
                                                    {...register('authorLastName')}
                                                    placeholder="Author's last name"
                                                    className="h-11"
                                                    autoFocus={false}
                                                />
                                            )}
                                        </div>
                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                Reading Time (minutes)
                                            </Label>
                                            {isSettingsReadOnly ? (
                                                <div className="min-h-11 px-4 py-3 border rounded-lg bg-muted/30 flex items-center">
                                                    {moduleData.estimatedReadingTime ? (
                                                        `${moduleData.estimatedReadingTime} minutes`
                                                    ) : (
                                                        <span className="text-muted-foreground italic">Not specified</span>
                                                    )}
                                                </div>
                                            ) : (
                                <Input
                                    type="number"
                                                    {...register('estimatedReadingTime', { valueAsNumber: true })}
                                                    placeholder="Reading time"
                                                    className="h-11"
                                    min="1"
                                                    max="999"
                                                    autoFocus={false}
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                                <Image className="h-4 w-4" />
                                                Cover Image URL
                                            </Label>
                                            {isSettingsReadOnly ? (
                                                <div className="min-h-11 px-4 py-3 border rounded-lg bg-muted/30 flex items-center">
                                                    {moduleData.imageUrl ? (
                                                        <a 
                                                            href={moduleData.imageUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-popover-foreground hover:underline truncate flex items-center gap-2"
                                                        >
                                                            <Image className="h-3 w-3" />
                                                            View Cover Image
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">No image specified</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <Input
                                                    type="url"
                                                    {...register('imageUrl')}
                                                    placeholder="https://example.com/image.jpg"
                                                    className={cn(
                                                        "h-11",
                                                        errors.imageUrl ? 'border-destructive focus-visible:ring-destructive' : ''
                                                    )}
                                                    autoFocus={false}
                                                />
                                            )}
                                            {errors.imageUrl && (
                                                <p className="text-sm text-destructive flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    {errors.imageUrl.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                    </div>

                                {/* Status Section */}
                                <div className="space-y-6">
                                    <h4 className="text-lg font-semibold">Module Status</h4>
                                    
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Publication Status</Label>
                                        <div className="flex items-center h-11">
                                            {isSettingsReadOnly ? (
                                                <div className={cn(
                                                    "inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium",
                                                    moduleData.isActive 
                                                        ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                                                        : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                                                )}>
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full mr-2",
                                                        moduleData.isActive ? "bg-green-500" : "bg-red-500"
                                                    )} />
                                                    {moduleData.isActive ? 'Published & Active' : 'Unpublished & Inactive'}
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-3">
                        <Controller
                            name="isActive"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                                                    <Label className="text-sm font-medium">
                                                        {watch('isActive') ? 'Published & Active' : 'Unpublished & Inactive'}
                                                    </Label>
                    </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {watch('isActive') 
                                                ? "This module is visible to students and available for reading practice"
                                                : "This module is hidden from students and not available for reading practice"
                                            }
                                        </p>
                                    </div>
                                </div>
                    </div>

                            <DialogFooter className="pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsModuleDialogOpen(false);
                                        // Reset form to original values when closing
                                        reset();
                                    }}
                                >
                                    Close Settings
                                </Button>
                                {!isSettingsReadOnly && canEdit && (
                                    <Button 
                                        type="submit" 
                                        disabled={isUpdating} 
                                        className="min-w-[140px]"
                                    >
                                        {isUpdating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-2" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                )}
                            </DialogFooter>
                        </form>
                        </div>
                    </DialogContent>
                </Dialog>

                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Update Error */}
                    {updateError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Update Failed</AlertTitle>
                            <AlertDescription>
                                {updateError.message || 'An unexpected error occurred while saving changes.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Enhanced Content Editor */}
                    {paragraphFields.length > 0 ? (
                        <Card className="shadow-xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-card/95 dark:from-card dark:via-card dark:to-card/90">
                            <CardHeader className="pb-6 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b-2 border-primary/10">
                                <div className="space-y-4">
                                    {/* Title and Action Buttons Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 shadow-lg">
                                                <FileText className="h-6 w-6 text-popover-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-foreground">
                                                    Paragraph {currentStep + 1}
                                                </h3>
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    Content Editor & Vocabulary Manager
                                                </p>
                        </div>
                    </div>

                                        {/* Action Buttons - Next to Title */}
                                        {canEdit && (
                                            <div className="flex items-center gap-2">
                                                {/* Desktop: Full buttons */}
                                                <div className="hidden sm:flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={addNewParagraph}
                                                        className="border-2 border-dashed border-primary/30 text-popover-foreground hover:bg-primary/10 hover:border-primary/50 shadow-md hover:shadow-lg transition-all duration-200"
                                                    >
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Add Paragraph
                                                    </Button>
                                                    
                                                    {paragraphFields.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(currentStep)}
                                                            className="border-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground shadow-md hover:shadow-lg transition-all duration-200"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Mobile: Icon-only buttons */}
                                                <div className="flex sm:hidden items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={addNewParagraph}
                                                        className="border-2 border-dashed border-primary/30 text-popover-foreground hover:bg-primary/10 p-2 shadow-md"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                    
                                                    {paragraphFields.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(currentStep)}
                                                            className="border-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground p-2 shadow-md"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Navigation Section - Under Title */}
                                    <div className="pt-4 border-t-2 border-primary/10">
                                        {/* Mobile Navigation */}
                                        <div className="block sm:hidden">
                                            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border/50">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={prevStep}
                                                    disabled={currentStep === 0}
                                                    className="p-2 border-2 shadow-sm hover:shadow-md transition-all duration-200"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl font-bold text-primary-foreground bg-primary w-12 px-4 py-2 rounded-xl border-2 border-accent/80 shadow-sm">
                                                        {currentStep + 1}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground font-medium">
                                                        of {paragraphFields.length}
                                                    </span>
                                                </div>
                                                
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={nextStep}
                                                    disabled={currentStep === paragraphFields.length - 1}
                                                    className="p-2 border-2 shadow-sm hover:shadow-md transition-all duration-200"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Desktop Navigation */}
                                        <div className="hidden sm:flex items-center justify-start">
                                            <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border border-accent/50">
                                                {paragraphFields.map((_, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => goToStep(index)}
                                                        className={cn(
                                                            "relative w-12 h-12 rounded-xl text-sm font-bold transition-all duration-300 border-2 shadow-md hover:shadow-lg",
                                                            index === currentStep
                                                                ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/30 scale-110 shadow-lg"
                                                                : "bg-card text-muted-foreground border-border/50 hover:bg-primary/5 hover:text-accent hover:border-primary/30 hover:scale-105"
                                                        )}
                                                    >
                                                        {index + 1}
                                                        {index === currentStep && (
                                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-card shadow-sm" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-8 p-8">
                                {/* Content Editor */}
                                <div className="space-y-4">
                                    <Label className="text-base font-semibold flex items-center gap-3 text-foreground">
                                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                                            <FileText className="h-5 w-5 text-popover-foreground" />
                                        </div>
                                        Content Editor
                                    </Label>
                                    {isViewMode ? (
                                        <div className="relative prose dark:prose-invert max-w-none p-6 border-2 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/45 border-primary/20 shadow-inner min-h-[280px] flex items-start">
                                            {currentParagraph.text ? (
                                                <div className="text-sm leading-relaxed m-0 text-foreground whitespace-pre-wrap">{currentParagraph.text}</div>
                                            ) : (
                                                <div className="text-muted-foreground italic m-0 text-center py-4 w-full">No content provided for this paragraph</div>
                                            )}
                                            <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                                                {currentParagraph.text?.length || 0} characters
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Controller
                                                name={`structuredContent.${currentStep}.text`}
                                                control={control}
                                                render={({ field }) => (
                                                    <Textarea
                                                        {...field}
                                                        placeholder="Enter paragraph content here..."
                                                        rows={10}
                                                        className="resize-none text-sm leading-relaxed border-2 border-primary/20 focus:border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 shadow-inner focus:shadow-lg transition-all duration-200 p-6 min-h-[280px]"
                                                        autoFocus={false}
                                                    />
                                                )}
                                            />
                                            <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                                                {currentParagraph.text?.length || 0} characters
                                            </div>
                                        </div>
                                    )}
                                    {errors.structuredContent?.[currentStep]?.text && (
                                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                                            <AlertCircle className="h-4 w-4 text-destructive" />
                                            <p className="text-sm text-destructive font-medium">
                                                {errors.structuredContent[currentStep]?.text?.message}
                                            </p>
                                        </div>
                                    )}
                                    
                                                                        {/* Action Buttons - Under Editor */}
                                    {canEdit && (
                                        <div className="flex justify-end items-center pt-0">
                                            {isViewMode ? (
                                                /* Edit Button */
                                                <Button
                                                    type="button"
                                                    variant="default"
                                                    size="sm"
                                                    onClick={toggleEditMode}
                                                    disabled={isUpdating}
                                                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/40"
                                                >
                                                    <Edit3 className="h-4 w-4 sm:mr-2" />
                                                    <span className="hidden sm:inline">Edit</span>
                                                </Button>
                                            ) : (
                                                /* Save and Cancel Buttons */
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={exitEditMode}
                                                        disabled={isUpdating}
                                                        className="min-w-[100px]"
                                                    >
                        Cancel
                    </Button>
                                                    <Button
                                                        type="submit"
                                                        disabled={isUpdating}
                                                        className="min-w-[140px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
                                                    >
                                                        {isUpdating ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save className="h-4 w-4 mr-2" />
                        Save Changes
                                                            </>
                                                        )}
                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Enhanced Vocabulary Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-semibold flex items-center gap-3 text-foreground">
                                            <div className="p-2 bg-accent/10 rounded-lg border border-accent/20">
                                                <BookOpen className="h-5 w-5 text-popover-foreground" />
                                            </div>
                                            <span className="hidden sm:inline">Vocabulary Words</span>
                                            <span className="sm:hidden">Vocabulary</span>
                                            {currentParagraphVocab && currentParagraphVocab.length > 0 && (
                                                <span className="text-sm px-3 py-1 bg-accent/20 text-accent rounded-full font-bold border border-accent/30">
                                                    <span className="hidden sm:inline">{currentParagraphVocab.length} words</span>
                                                    <span className="sm:hidden">{currentParagraphVocab.length}</span>
                                                </span>
                                            )}
                                        </Label>
                                        {canEdit && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    exitEditMode(); // Exit edit mode when adding vocabulary
                                                    setShowAddVocabDialog(true);
                                                }}
                                                className="border-2 border-dashed border-accent/40 text-accent hover:bg-accent/10 shadow-md hover:shadow-lg transition-all duration-200"
                                                disabled={currentParagraphIndex > (moduleData?.structuredContent?.length || 0)}
                                                title={currentParagraphIndex > (moduleData?.structuredContent?.length || 0) ? "Save the module first to add vocabulary to new paragraphs" : "Add vocabulary word"}
                                            >
                                                <Plus className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">Add Word</span>
                                            </Button>
                                        )}
                                    </div>

                                    {/* Existing Vocabulary */}
                                    {isLoadingVocab ? (
                                        <div className="grid gap-4">
                                            {[...Array(2)].map((_, i) => (
                                                <div key={i} className="p-6 rounded-xl border-2 border-accent/20">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0 flex-1 space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <Skeleton className="h-5 w-8 rounded-full" />
                                                                <Skeleton className="h-6 w-24" />
                                                            </div>
                                                            <Skeleton className="h-4 w-full" />
                                                            <Skeleton className="h-4 w-3/4" />
                                                        </div>
                                                        <Skeleton className="h-8 w-8" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : currentParagraphVocab && currentParagraphVocab.length > 0 ? (
                                        <div className="grid gap-4">
                                            {currentParagraphVocab.map((entry, index) => (
                                                <div 
                                                    key={entry.id} 
                                                    className="group p-6 rounded-xl border-2 border-accent/20 bg-gradient-to-br from-card via-card to-card/90 hover:shadow-xl hover:border-accent/40 transition-all duration-300 hover:scale-[1.02]"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0 flex-1 space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs px-3 py-1 bg-accent/20 text-accent rounded-full font-bold border border-accent/30">
                                                                    #{index + 1}
                                                                </span>
                                                                <h4 className="font-bold text-lg text-foreground">
                                                                    {entry.word}
                                                                </h4>
                                                            </div>
                                                            <p className="text-base text-muted-foreground leading-relaxed pl-1">
                                                                {entry.description}
                                                            </p>
                                                        </div>
                                                        {canEdit && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteVocabulary(entry.id, entry.word)}
                                                                className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive/30 shadow-sm hover:shadow-md"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center p-2 border-2 border-dashed border-accent/30 rounded-xl bg-gradient-to-br from-accent/5 to-transparent">
                                            <div className=" bg-accent/10 rounded-full w-fit mx-auto mb-2 border border-accent/20">
                                                <BookOpen className="h-10 w-10 text-popover-foreground" />
                                            </div>
                                            <h4 className="text-sm font-semibold text-foreground mb-1">
                                                No vocabulary words yet
                                            </h4>
                                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                                Add vocabulary words to help students understand difficult terms and concepts in this paragraph.
                                            </p>
                                        </div>
                                    )}
                                </div>
                </CardContent>
        </Card>
                    ) : (
                        /* Empty State */
                        <Card className="shadow-lg">
                            <CardContent className="py-16">
                                <div className="text-center space-y-6">
                                    <div className="w-20 h-20 mx-auto bg-muted/50 rounded-2xl flex items-center justify-center">
                                        <FileText className="h-10 w-10 text-popover-foreground" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-semibold text-foreground">
                                            No Content Found
                                        </h3>
                                        <p className="text-muted-foreground max-w-md mx-auto">
                                            This module doesn't have any paragraphs yet. Add your first paragraph to begin building the reading content.
                                        </p>
                                    </div>
                                    {!isViewMode && canEdit && (
                                        <Button
                                            type="button"
                                            onClick={addNewParagraph}
                                            size="lg"
                                            className="mt-6"
                                        >
                                            <Plus className="h-5 w-5 mr-2" />
                                            Create First Paragraph
                                        </Button>
                                    )}
                                </div>
                </CardContent>
                        </Card>
                                        )}

                    {/* Delete Dialogs */}
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete Paragraph</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete this paragraph? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={cancelDelete}>
                        Cancel
                    </Button>
                                <Button type="button" variant="destructive" onClick={confirmDeleteParagraph}>
                                    Delete Paragraph
                    </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showVocabDeleteDialog} onOpenChange={setShowVocabDeleteDialog}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete Vocabulary Word</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete the vocabulary word "{vocabToDelete?.word}"? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={cancelVocabDelete}>
                                    Cancel
                                </Button>
                                <Button type="button" variant="destructive" onClick={confirmDeleteVocabulary}>
                                    Delete Word
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Add Vocabulary Dialog */}
                    <Dialog open={showAddVocabDialog} onOpenChange={setShowAddVocabDialog}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Plus className="h-5 w-5 text-popover-foreground" />
                                    Add Vocabulary Word
                                </DialogTitle>
                                <DialogDescription>
                                    Add a new vocabulary word to help students understand this paragraph.
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dialogVocabWord" className="text-sm font-medium">
                                        Word
                                    </Label>
                                    <Input
                                        id="dialogVocabWord"
                                        value={newVocabWord}
                                        onChange={(e) => setNewVocabWord(e.target.value)}
                                        placeholder="Enter vocabulary word"
                                        className="h-11"
                                        autoFocus={false}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dialogVocabDescription" className="text-sm font-medium">
                                        Definition
                                    </Label>
                                    <Input
                                        id="dialogVocabDescription"
                                        value={newVocabDescription}
                                        onChange={(e) => setNewVocabDescription(e.target.value)}
                                        placeholder="Enter word definition"
                                        className="h-11"
                                        autoFocus={false}
                                    />
                                </div>
                            </div>
                            
                            <DialogFooter>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => {
                                        setShowAddVocabDialog(false);
                                        setNewVocabWord('');
                                        setNewVocabDescription('');
                                    }}
                                >
                        Cancel
                    </Button>
                                <Button
                                    type="button"
                                    onClick={handleAddVocabulary}
                                    disabled={isAddingVocab || !newVocabWord.trim() || !newVocabDescription.trim()}
                                    className="min-w-[120px]"
                                >
                                    {isAddingVocab ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Word
                                        </>
                                    )}
                    </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
            </form>
            </div>
        </PageContainer>
    );
} 