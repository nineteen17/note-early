'use client';

import React, { useEffect } from 'react';
import { useForm, Controller, SubmitHandler, type Resolver, useFieldArray } from 'react-hook-form';
import { useRouter } from 'next/navigation';
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
import { Loader2, Plus, Trash2, GripVertical, BookOpen, Hash, Type, Tag, Eye } from 'lucide-react';

import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
import { useUpdateModuleMutation } from '@/hooks/api/admin/modules/useUpdateModuleMutation';
import { updateModuleSchema, UpdateModuleInput, levelOptions, genreOptions, languageOptions, ReadingModule } from '@/lib/schemas/modules';
import { useModuleVocabularyQuery } from '@/hooks/api/admin/modules/useModuleVocabularyQuery';
import { useDeleteVocabularyMutation } from '@/hooks/api/vocabulary/useDeleteVocabularyMutation';

interface AdminEditModuleProps {
    moduleId: string;
}

export function AdminEditModule({ moduleId }: AdminEditModuleProps) {
    const router = useRouter();

    const { data: moduleData, isLoading: isLoadingModule, error: moduleError } = useModuleQuery(moduleId);
    const { data: vocabulary = [] } = useModuleVocabularyQuery(moduleId);

    const { mutate: updateModuleMutateFn, isPending: isUpdating, error: updateError } = useUpdateModuleMutation(moduleId);
    const { mutate: deleteVocabularyMutate } = useDeleteVocabularyMutation(moduleId);

    const {
        control,
        handleSubmit,
        register,
        reset,
        formState: { errors, isSubmitting, dirtyFields },
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

    // Helper function to add paragraph with proper index
    const addNewParagraph = () => {
        const nextIndex = paragraphFields.length + 1;
        appendParagraph({ index: nextIndex, text: '' });
    };

    // Helper function to remove paragraph and reindex
    const removeParagraphWithReindex = (indexToRemove: number) => {
        removeParagraph(indexToRemove);
        // Note: We might need to reindex paragraphs after removal
        // This could be handled in the onSubmit to ensure proper indexing
    };

    useEffect(() => {
        if (moduleData) {
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
                structuredContent: moduleData.structuredContent && moduleData.structuredContent.length > 0
                    ? moduleData.structuredContent
                    : [{ index: 1, text: '' }],
            });
        }
    }, [moduleData, reset]);

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
                (changedData as any)[key] = data[key];
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
            },
            onError: (error) => {
                console.error("Update failed from component callback:", error);
            },
        });
    };

    if (isLoadingModule) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    if (moduleError) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error Fetching Module</AlertTitle>
                <AlertDescription>
                    Failed to load module data. {moduleError.message}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-8">
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* MODULE METADATA SECTION */}
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Tag className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-semibold">Module Information</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">Basic details and metadata for your module</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {updateError && (
                            <Alert variant="destructive">
                                <AlertTitle>Update Failed</AlertTitle>
                                <AlertDescription>
                                    {updateError.message || 'An unexpected error occurred.'}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Title & Description */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                                <Input
                                    id="title"
                                    {...register("title")}
                                    aria-invalid={errors.title ? "true" : "false"}
                                    className="h-11"
                                />
                                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    {...register("description")}
                                    className="min-h-[80px] resize-none"
                                    placeholder="Brief description of the module content..."
                                />
                                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                            </div>
                        </div>

                        {/* Module Properties */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="level" className="text-sm font-medium">Reading Level</Label>
                                <Controller
                                    name="level"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={(value) => field.onChange(Number(value))}
                                            value={field.value?.toString()}
                                        >
                                            <SelectTrigger id="level" className="h-11">
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
                                {errors.level && <p className="text-sm text-destructive">{errors.level.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="genre" className="text-sm font-medium">Genre</Label>
                                <Controller
                                    name="genre"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger id="genre" className="h-11">
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
                                {errors.genre && <p className="text-sm text-destructive">{errors.genre.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="language" className="text-sm font-medium">Language</Label>
                                <Controller
                                    name="language"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger id="language" className="h-11">
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
                                {errors.language && <p className="text-sm text-destructive">{errors.language.message}</p>}
                            </div>
                        </div>

                        {/* Additional Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="imageUrl" className="text-sm font-medium">Cover Image URL (Optional)</Label>
                                <Input
                                    id="imageUrl"
                                    type="url"
                                    {...register("imageUrl")}
                                    placeholder="https://example.com/image.png"
                                    className="h-11"
                                />
                                {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="estimatedReadingTime" className="text-sm font-medium">Reading Time (Minutes)</Label>
                                <Controller
                                    name="estimatedReadingTime"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="estimatedReadingTime"
                                            type="number"
                                            placeholder="e.g., 15"
                                            min="1"
                                            className="h-11"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={e => {
                                                const value = e.target.value;
                                                field.onChange(value === '' ? null : Number(value));
                                            }}
                                        />
                                    )}
                                />
                                {errors.estimatedReadingTime && <p className="text-sm text-destructive">{errors.estimatedReadingTime.message}</p>}
                            </div>
                        </div>

                        {/* Author Information */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground">Author Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="authorFirstName" className="text-sm font-medium">Author First Name</Label>
                                    <Input
                                        id="authorFirstName"
                                        {...register("authorFirstName")}
                                        placeholder="e.g., Jane"
                                        className="h-11"
                                    />
                                    {errors.authorFirstName && <p className="text-sm text-destructive">{errors.authorFirstName.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="authorLastName" className="text-sm font-medium">Author Last Name</Label>
                                    <Input
                                        id="authorLastName"
                                        {...register("authorLastName")}
                                        placeholder="e.g., Smith"
                                        className="h-11"
                                    />
                                    {errors.authorLastName && <p className="text-sm text-destructive">{errors.authorLastName.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                            <div className="flex items-center gap-3">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <Label htmlFor="isActive" className="text-sm font-medium">Module Visibility</Label>
                                    <p className="text-xs text-muted-foreground">Control whether students can see this module</p>
                                </div>
                            </div>
                            <Controller
                                name="isActive"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-center gap-3">
                                        <span className={`text-sm font-medium ${field.value ? 'text-green-600' : 'text-muted-foreground'}`}>
                                            {field.value ? 'Published' : 'Draft'}
                                        </span>
                                        <Switch
                                            id="isActive"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </div>
                                )}
                            />
                            {errors.isActive && <p className="text-sm text-destructive">{errors.isActive.message}</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* MODULE CONTENT SECTION */}
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <BookOpen className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-semibold">Module Content</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Paragraphs and vocabulary ({paragraphFields.length} paragraphs, {vocabulary.length} vocabulary entries)
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addNewParagraph}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Paragraph
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">


                        {paragraphFields.length === 0 && (
                            <div className="border border-dashed border-border/50 rounded-lg p-8 text-center">
                                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground mb-4">No paragraphs yet. Add your first paragraph to get started.</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addNewParagraph}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add First Paragraph
                                </Button>
                            </div>
                        )}

                        <div className="space-y-6">
                            {paragraphFields.map((field, index) => {
                                // Get vocabulary for this specific paragraph
                                const paragraphVocabulary = vocabulary.filter(
                                    (vocab) => vocab.paragraphIndex === field.index
                                );

                                return (
                                    <Card key={field.id} className="border-border/50 shadow-sm">
                                        <CardHeader className="pb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <GripVertical className="h-4 w-4" />
                                                        <Hash className="h-4 w-4" />
                                                        <span className="font-medium">Paragraph {field.index}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeParagraphWithReindex(index)}
                                                    disabled={paragraphFields.length === 1}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Paragraph Content */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Type className="h-4 w-4 text-muted-foreground" />
                                                    <Label htmlFor={`paragraph-${index}`} className="font-medium">
                                                        Content
                                                    </Label>
                                                </div>
                                                <Controller
                                                    name={`structuredContent.${index}.text`}
                                                    control={control}
                                                    render={({ field: textField }) => (
                                                        <Textarea
                                                            id={`paragraph-${index}`}
                                                            placeholder="Enter paragraph content..."
                                                            className="min-h-[120px] resize-none"
                                                            {...textField}
                                                        />
                                                    )}
                                                />
                                                {errors.structuredContent?.[index]?.text && (
                                                    <p className="text-sm text-destructive">
                                                        {errors.structuredContent[index]?.text?.message}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Vocabulary Section */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Tag className="h-4 w-4 text-muted-foreground" />
                                                        <Label className="font-medium">
                                                            Vocabulary ({paragraphVocabulary.length})
                                                        </Label>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            // For now, we'll show a placeholder since we don't have create mutation
                                                            toast.info("Vocabulary creation coming soon");
                                                        }}
                                                        className="text-xs"
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Add Word
                                                    </Button>
                                                </div>

                                                {paragraphVocabulary.length === 0 ? (
                                                    <div className="border border-dashed border-border/30 rounded-md p-4 text-center">
                                                        <p className="text-sm text-muted-foreground">
                                                            No vocabulary defined for this paragraph.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {paragraphVocabulary.map((vocab) => (
                                                            <div
                                                                key={vocab.id}
                                                                className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border/30"
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-sm">{vocab.word}</div>
                                                                    <div className="text-xs text-muted-foreground truncate">
                                                                        {vocab.description}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            toast.info("Vocabulary editing coming soon");
                                                                        }}
                                                                        className="h-8 w-8 p-0"
                                                                    >
                                                                        <Eye className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            if (confirm(`Delete vocabulary word "${vocab.word}"?`)) {
                                                                                deleteVocabularyMutate(vocab.id);
                                                                            }
                                                                        }}
                                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {errors.structuredContent && (
                            <p className="text-sm text-destructive">
                                {errors.structuredContent.message || "Please check paragraph content"}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* FORM ACTIONS */}
                <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={isUpdating || isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={!Object.keys(dirtyFields).length || isUpdating || isSubmitting}>
                        {isUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
} 