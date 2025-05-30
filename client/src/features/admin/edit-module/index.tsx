'use client';

import React, { useEffect } from 'react';
import { useForm, Controller, SubmitHandler, type Resolver } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { Separator } from "@/components/ui/separator";

import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
import { useUpdateModuleMutation } from '@/hooks/api/admin/modules/useUpdateModuleMutation';
import { updateModuleSchema, UpdateModuleInput, levelOptions, genreOptions, languageOptions, ReadingModule } from '@/lib/schemas/modules';
import { VocabularyManagementSection } from './VocabularyManagementSection';

interface AdminEditModuleProps {
    moduleId: string;
}

export function AdminEditModule({ moduleId }: AdminEditModuleProps) {
    const router = useRouter();

    const { data: moduleData, isLoading: isLoadingModule, error: moduleError } = useModuleQuery(moduleId);

    const { mutate: updateModuleMutateFn, isPending: isUpdating, error: updateError } = useUpdateModuleMutation(moduleId);

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
            isActive: true,
            structuredContent: [{ index: 1, text: '' }],
        },
    });

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
                isActive: moduleData.isActive,
                structuredContent: moduleData.structuredContent && moduleData.structuredContent.length > 0
                    ? moduleData.structuredContent
                    : [{ index: 1, text: '' }],
            });
        }
    }, [moduleData, reset]);

    const onSubmit: SubmitHandler<UpdateModuleInput> = (data) => {
        console.log("Raw form data:", data);

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

        console.log("Changed data identified:", changedData);

        if (!hasChanges) {
            toast.info("No changes detected to save.");
            return;
        }

        console.log("Submitting changes:", changedData);

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
        <Card>
            <CardHeader>
                <CardTitle>Edit Module: {moduleData?.title || 'Loading...'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {updateError && (
                        <Alert variant="destructive">
                            <AlertTitle>Update Failed</AlertTitle>
                            <AlertDescription>
                                {updateError.message || 'An unexpected error occurred.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            {...register("title")}
                            aria-invalid={errors.title ? "true" : "false"}
                        />
                        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            {...register("description")}
                        />
                        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="level">Level</Label>
                            <Controller
                                name="level"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        onValueChange={(value) => field.onChange(Number(value))}
                                        value={field.value?.toString()}
                                    >
                                        <SelectTrigger id="level">
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {levelOptions.map((level) => (
                                                <SelectItem key={level} value={level.toString()}>
                                                    {level}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.level && <p className="text-sm text-red-600">{errors.level.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="genre">Genre</Label>
                            <Controller
                                name="genre"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="genre">
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
                            {errors.genre && <p className="text-sm text-red-600">{errors.genre.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="language">Language</Label>
                            <Controller
                                name="language"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="language">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {languageOptions.map((lang) => (
                                                <SelectItem key={lang} value={lang}>
                                                    {lang}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.language && <p className="text-sm text-red-600">{errors.language.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                        <Input
                            id="imageUrl"
                            type="url"
                            {...register("imageUrl")}
                            placeholder="https://example.com/image.png"
                        />
                        {errors.imageUrl && <p className="text-sm text-red-600">{errors.imageUrl.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="estimatedReadingTime">Estimated Reading Time (Minutes, Optional)</Label>
                        <Controller
                            name="estimatedReadingTime"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="estimatedReadingTime"
                                    type="number"
                                    placeholder="e.g., 15"
                                    min="1"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={e => {
                                        const value = e.target.value;
                                        field.onChange(value === '' ? null : Number(value));
                                    }}
                                />
                            )}
                        />
                        {errors.estimatedReadingTime && <p className="text-sm text-red-600">{errors.estimatedReadingTime.message}</p>}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Controller
                            name="isActive"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="isActive"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                        <Label htmlFor="isActive">Active</Label>
                        {errors.isActive && <p className="text-sm text-red-600">{errors.isActive.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Module Content</Label>
                        <div className="space-y-2 border p-4 rounded-md bg-muted/30 min-h-[100px]">
                            <Label className="text-muted-foreground">Structured Content Editor (Placeholder)</Label>
                            <input type="hidden" {...register('structuredContent')} />
                            <p className="text-sm text-muted-foreground">The visual editor for adding/removing/editing paragraphs will go here once created.</p>
                            {errors.structuredContent && !errors.structuredContent.root && (
                                <p className="text-sm text-red-600">{errors.structuredContent.message}</p>
                            )}
                            {errors.structuredContent?.root && (
                                <p className="text-sm text-red-600">{errors.structuredContent.root.message}</p>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {moduleData && (
                        <VocabularyManagementSection
                            moduleId={moduleId}
                            paragraphs={moduleData.structuredContent || []} />
                    )}

                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={isUpdating || isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={!Object.keys(dirtyFields).length || isUpdating || isSubmitting}>
                        {isUpdating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
} 