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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    Info,

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
    const [mobileTab, setMobileTab] = useState<'paragraph' | 'vocabulary'>('paragraph');

    // Vocabulary deletion state
    const [vocabToDelete, setVocabToDelete] = useState<{id: string, word: string} | null>(null);
    const [showVocabDeleteDialog, setShowVocabDeleteDialog] = useState(false);

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

    const handleDeleteVocabulary = (vocabId: string, word: string) => {
        setVocabToDelete({id: vocabId, word});
        setShowVocabDeleteDialog(true);
    };

    const confirmDeleteVocabulary = () => {
        if (vocabToDelete) {
            exitEditMode(); // Exit edit mode when performing other actions
            
            deleteVocabularyMutate(vocabToDelete.id, {
                onSuccess: () => {
                    setShowVocabDeleteDialog(false);
                    setVocabToDelete(null);
                },
                onError: () => {
                    // Error toast is handled in the hook
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
                <Card className="border-0 shadow-sm">
                    <CardHeader className="">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-2 min-w-0 flex-grow">
                                <div className="flex items-center gap-3">
                                    {/* Desktop: Show full title, Mobile: Show truncated with dropdown */}
                                    <div className="min-w-0 flex-1">
                                        {/* Desktop view - full title */}
                                        <CardTitle className="hidden md:block text-lg sm:text-xl font-semibold tracking-tight">
                                            {moduleData.title}
                                        </CardTitle>
                                        
                                        {/* Mobile view - clickable dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <CardTitle className="md:hidden text-lg sm:text-xl font-semibold tracking-tight truncate max-w-[200px] sm:max-w-[300px] cursor-pointer hover:text-primary transition-colors">
                                                    {moduleData.title}
                                                </CardTitle>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="max-w-sm">
                                                <DropdownMenuItem className="flex items-center gap-2 p-3">
                                                    <span className="ml-auto">{moduleData.title}</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                {moduleData.description && (
                                    <div className="min-w-0">
                                        {/* Desktop: Show full description, Mobile: Show truncated with dropdown */}
                                        <p className="hidden md:block text-sm text-muted-foreground max-w-2xl">
                                            {moduleData.description}
                                        </p>
                                        
                                        {/* Mobile view - clickable dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <p className="md:hidden text-sm text-muted-foreground truncate max-w-[250px] sm:max-w-[350px] cursor-pointer hover:text-primary transition-colors">
                                                    {moduleData.description}
                                                </p>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="max-w-sm">
                                                <DropdownMenuItem className="flex items-center gap-2 p-3">
                                                    <span className="ml-auto text-sm">{moduleData.description}</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}
                            </div>
                            
                            {/* Compact Meta Information */}
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{paragraphFields.length}</span>
                                </div>
                                
                                <span className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
                                    moduleData.isActive 
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                )}>
                                    {moduleData.isActive ? 'Active' : 'Inactive'}
                                </span>
                                
                                <span className={cn(
                                    "text-xs px-2 py-1 rounded-md font-medium",
                                    isCuratedModule 
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                )}>
                                    {getModuleTypeDisplayName(moduleData.type)}
                                </span>

                                <span className={cn(
                                    "text-xs px-2 py-1 rounded-md font-medium",
                                    canEdit 
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                )}>
                                    {canEdit ? 'Editable' : 'Read Only'}
                                </span>
                                
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        exitEditMode();
                                        setIsModuleDialogOpen(true);
                                    }}
                                >
                                    <Info className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Enhanced Module Settings Dialog */}
                <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
                    <DialogContent className="max-w-4xl w-[90vw] sm:w-[85vw] max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-0">
                        <div className="p-4 sm:p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)}>
                            <DialogHeader className="pb-6 border-b">
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <Info className="h-5 w-5" />
                                    Module Information
                                    {isSettingsReadOnly && (
                                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
                                            Read Only
                                        </span>
                                    )}
                                </DialogTitle>
                                <DialogDescription>
                                    Configure module metadata, properties, and content information
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-8 py-6">
                                {/* Title & Description Section */}
                                <div className="space-y-6">

                                    
                                    <div className="grid gap-6">
                    <div className="space-y-2">
                                            <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
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
                                    Close Information
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
                    {paragraphFields.length > 0 && (
                        <div className="flex flex-col h-[calc(100vh-280px)]">
                            {/* Desktop View - Side by Side Cards */}
                            <div className="hidden lg:block flex-1 min-h-0">
                                <div className="grid gap-6 lg:grid-cols-2 h-full">
                                    {/* Paragraph Content */}
                                    <Card className="shadow-md overflow-hidden flex flex-col h-full">
                                        <CardHeader className="flex-shrink-0 pb-3 border-b">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <div className="p-2 bg-primary/10 rounded-lg">
                                                        <FileText className="h-4 w-4 text-primary" />
                                                    </div>
                                                    Paragraph {currentStep + 1}
                                                </CardTitle>
                                                
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        {paragraphFields.map((_, i) => (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => setCurrentStep(i)}
                                                                className={cn(
                                                                    "w-2.5 h-2.5 rounded-full transition-colors",
                                                                    i === currentStep 
                                                                        ? "bg-accent" 
                                                                        : "bg-muted-foreground/30"
                                                                )}
                                                                title={`Paragraph ${i + 1}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={prevStep}
                                                            disabled={currentStep === 0}
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={nextStep}
                                                            disabled={currentStep === paragraphFields.length - 1}
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-1 min-h-0 pb-4 flex flex-col">
                                            {/* Content Area - Fixed Height */}
                                            <div className="flex-1 min-h-0 mb-4">
                                                {isViewMode ? (
                                                    <Textarea
                                                        value={currentParagraph.text || ''}
                                                        className="h-full resize-none bg-muted/30 border"
                                                        readOnly
                                                        placeholder="No content provided for this paragraph"
                                                    />
                                                ) : (
                                                    <Controller
                                                        name={`structuredContent.${currentStep}.text`}
                                                        control={control}
                                                        render={({ field }) => (
                                                            <Textarea
                                                                {...field}
                                                                placeholder="Enter paragraph content here..."
                                                                className="h-full resize-none"
                                                            />
                                                        )}
                                                    />
                                                )}
                                            </div>
                                            
                                            {/* Fixed Action Buttons */}
                                            {canEdit && (
                                                <div className="flex justify-between items-center pt-2 border-t flex-shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={addNewParagraph}
                                                            className="gap-2"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Add
                                                        </Button>
                                                        {paragraphFields.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeleteClick(currentStep)}
                                                                className="gap-2 text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {isViewMode ? (
                                                            <Button
                                                                type="button"
                                                                variant="default"
                                                                size="sm"
                                                                onClick={toggleEditMode}
                                                                className="gap-2"
                                                            >
                                                                <Edit3 className="h-4 w-4" />
                                                                Edit
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={exitEditMode}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    type="submit"
                                                                    size="sm"
                                                                    disabled={isUpdating}
                                                                    className="gap-2"
                                                                >
                                                                    {isUpdating ? (
                                                                        <>
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                            Saving...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Save className="h-4 w-4" />
                                                                            Save
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Vocabulary */}
                                    <Card className="shadow-md overflow-hidden flex flex-col h-full">
                                        <CardHeader className="flex-shrink-0 pb-3 border-b">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                                        <BookOpen className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    Vocabulary
                                                    {currentParagraphVocab && currentParagraphVocab.length > 0 && (
                                                        <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                                            {currentParagraphVocab.length}
                                                        </span>
                                                    )}
                                                </CardTitle>
                                                
                                                {canEdit && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            exitEditMode();
                                                            setShowAddVocabDialog(true);
                                                        }}
                                                        className="gap-2"
                                                        disabled={currentParagraphIndex > (moduleData?.structuredContent?.length || 0)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Add
                                                    </Button>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-1 min-h-0 pb-4">
                                            <div className="h-full overflow-auto">
                                                {isLoadingVocab ? (
                                                    <div className="space-y-4">
                                                        {[...Array(2)].map((_, i) => (
                                                            <div key={i} className="p-4 rounded-lg border">
                                                                <Skeleton className="h-4 w-24 mb-2" />
                                                                <Skeleton className="h-3 w-full" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : currentParagraphVocab && currentParagraphVocab.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {currentParagraphVocab.map((entry, index) => (
                                                            <div key={entry.id} className="p-4 rounded-lg border bg-muted/30">
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                                                                #{index + 1}
                                                                            </span>
                                                                            <h4 className="font-semibold">{entry.word}</h4>
                                                                        </div>
                                                                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                                                                    </div>
                                                                    {canEdit && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteVocabulary(entry.id, entry.word)}
                                                                            className="text-destructive hover:text-destructive"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-muted-foreground">
                                                        <div className="text-center">
                                                            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                            <p className="text-sm italic">No vocabulary words yet</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Mobile View - Tabbed Interface */}
                            <div className="lg:hidden flex-1 min-h-0">
                                <Tabs value={mobileTab} onValueChange={(value) => setMobileTab(value as 'paragraph' | 'vocabulary')} className="h-full flex flex-col">
                                    <div className="flex-shrink-0 space-y-3">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="paragraph">Paragraph</TabsTrigger>
                                            <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
                                        </TabsList>
                                        
                                        {/* Navigation Controls */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium">
                                                    {currentStep + 1} of {paragraphFields.length}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {paragraphFields.map((_, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => setCurrentStep(i)}
                                                            className={cn(
                                                                "w-2.5 h-2.5 rounded-full transition-colors",
                                                                i === currentStep 
                                                                    ? "bg-accent" 
                                                                    : "bg-muted-foreground/30"
                                                            )}
                                                            title={`Paragraph ${i + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={prevStep}
                                                    disabled={currentStep === 0}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={nextStep}
                                                    disabled={currentStep === paragraphFields.length - 1}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <TabsContent value="paragraph" className="flex-1 min-h-0 mt-4">
                                        <Card className="shadow-md overflow-hidden h-full flex flex-col">
                                            <CardHeader className="flex-shrink-0 pb-3 border-b">
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <div className="p-2 bg-primary/10 rounded-lg">
                                                        <FileText className="h-4 w-4 text-primary" />
                                                    </div>
                                                    Paragraph {currentStep + 1}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-1 min-h-0 pb-4 flex flex-col">
                                                {/* Content Area - Fixed Height */}
                                                <div className="flex-1 min-h-0 mb-4">
                                                    {isViewMode ? (
                                                        <Textarea
                                                            value={currentParagraph.text || ''}
                                                            className="h-full resize-none bg-muted/30 border"
                                                            readOnly
                                                            placeholder="No content provided for this paragraph"
                                                        />
                                                    ) : (
                                                        <Controller
                                                            name={`structuredContent.${currentStep}.text`}
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Textarea
                                                                    {...field}
                                                                    placeholder="Enter paragraph content here..."
                                                                    className="h-full resize-none"
                                                                />
                                                            )}
                                                        />
                                                    )}
                                                </div>
                                                
                                                {/* Fixed Action Buttons */}
                                                {canEdit && (
                                                    <div className="flex justify-between items-center pt-2 border-t flex-shrink-0">
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={addNewParagraph}
                                                                className="gap-2"
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                                Add
                                                            </Button>
                                                            {paragraphFields.length > 1 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteClick(currentStep)}
                                                                    className="gap-2 text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Delete
                                                                </Button>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            {isViewMode ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={toggleEditMode}
                                                                    className="gap-2"
                                                                >
                                                                    <Edit3 className="h-4 w-4" />
                                                                    Edit
                                                                </Button>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={exitEditMode}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        type="submit"
                                                                        size="sm"
                                                                        disabled={isUpdating}
                                                                        className="gap-2"
                                                                    >
                                                                        {isUpdating ? (
                                                                            <>
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                                Saving...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Save className="h-4 w-4" />
                                                                                Save
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                    
                                    <TabsContent value="vocabulary" className="flex-1 min-h-0 mt-4">
                                        <Card className="shadow-md overflow-hidden h-full flex flex-col">
                                            <CardHeader className="flex-shrink-0 pb-3 border-b">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="flex items-center gap-2 text-lg">
                                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                                            <BookOpen className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        Vocabulary
                                                        {currentParagraphVocab && currentParagraphVocab.length > 0 && (
                                                            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                                                {currentParagraphVocab.length}
                                                            </span>
                                                        )}
                                                    </CardTitle>
                                                    
                                                    {canEdit && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                exitEditMode();
                                                                setShowAddVocabDialog(true);
                                                            }}
                                                            className="gap-2"
                                                            disabled={currentParagraphIndex > (moduleData?.structuredContent?.length || 0)}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                            Add
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-1 min-h-0 pb-4">
                                                <div className="h-full overflow-auto">
                                                    {isLoadingVocab ? (
                                                        <div className="space-y-4">
                                                            {[...Array(2)].map((_, i) => (
                                                                <div key={i} className="p-4 rounded-lg border">
                                                                    <Skeleton className="h-4 w-24 mb-2" />
                                                                    <Skeleton className="h-3 w-full" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : currentParagraphVocab && currentParagraphVocab.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {currentParagraphVocab.map((entry, index) => (
                                                                <div key={entry.id} className="p-4 rounded-lg border bg-muted/30">
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                                                                    #{index + 1}
                                                                                </span>
                                                                                <h4 className="font-semibold">{entry.word}</h4>
                                                                            </div>
                                                                            <p className="text-sm text-muted-foreground">{entry.description}</p>
                                                                        </div>
                                                                        {canEdit && (
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => handleDeleteVocabulary(entry.id, entry.word)}
                                                                                className="text-destructive hover:text-destructive"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center text-muted-foreground">
                                                            <div className="text-center">
                                                                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                                <p className="text-sm italic">No vocabulary words yet</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    )}

                    {/* Delete Dialogs */}
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogContent className="w-[90vw] sm:w-full max-w-md">
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
                        <DialogContent className="w-[90vw] sm:w-full max-w-md">
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
                        <DialogContent className="max-w-md w-[90vw] sm:w-full">
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