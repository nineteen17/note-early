'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod'; // Import zodResolver
import { updateModuleSchema, type UpdateModuleInput, type ReadingModule } from '@/lib/schemas/modules';
import { useUpdateModuleMutation } from '@/hooks/api/admin/modules/useUpdateModuleMutation';
import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery'; // Assuming this hook exists

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';

// Define options based on schema enums (reuse from create form if possible)
const levelOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
type ModuleLevel = typeof levelOptions[number];
const genreOptions = ["History", "Adventure", "Science", "Non-Fiction", "Fantasy", "Biography", "Mystery", "Science-Fiction", "Folktale", "Custom"] as const;
const languageOptions = ["UK", "US"] as const;

interface AdminUpdateModuleProps {
  moduleId: string;
}

export function AdminUpdateModule({ moduleId }: AdminUpdateModuleProps) {
  const router = useRouter();
  const { data: moduleData, isLoading: isLoadingModule, error: queryError } = useModuleQuery(moduleId);
  const mutation = useUpdateModuleMutation(moduleId);

  const { 
    register, 
    handleSubmit, 
    control,
    formState: { errors, isSubmitting, isDirty }, // Track dirty state to enable/disable submit
    reset, 
    setValue, // Use setValue to update indices after removal
    watch    // Use watch to get current array state
  } = useForm<UpdateModuleInput>({
    resolver: zodResolver(updateModuleSchema) as Resolver<UpdateModuleInput>,
    defaultValues: {
      // Initialize with empty/default values, will be overridden by useEffect
      title: '',
      description: '', 
      level: 1,
      genre: 'Custom',
      language: 'UK',
      imageUrl: '',
      estimatedReadingTime: null,
      isActive: true,
      structuredContent: [{ index: 1, text: '' }],
    },
  });

  // Populate form with fetched data
  useEffect(() => {
    if (moduleData) {
      // Ensure structuredContent has at least one item for the form
      const content = moduleData.structuredContent && moduleData.structuredContent.length > 0 
        ? moduleData.structuredContent
        : [{ index: 1, text: '' }];
        
      reset({
        title: moduleData.title,
        description: moduleData.description ?? '', // Handle null description
        level: moduleData.level as ModuleLevel,
        genre: moduleData.genre,
        language: moduleData.language,
        imageUrl: moduleData.imageUrl ?? '', // Handle null imageUrl
        estimatedReadingTime: moduleData.estimatedReadingTime ?? null, // Ensure null if undefined
        isActive: moduleData.isActive,
        structuredContent: content, 
      });
    }
  }, [moduleData, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "structuredContent",
    keyName: "id",
  });

  // Function to add a new paragraph
  const addParagraph = () => {
    const nextIndex = fields.length > 0 ? fields[fields.length - 1].index + 1 : 1;
    append({ index: nextIndex, text: '' });
  };
  
  // Function to remove a paragraph and update subsequent indices
  const removeParagraph = (indexToRemove: number) => {
    remove(indexToRemove);
    // Re-index after removal
    const currentParagraphs = watch('structuredContent');
    // Add null check before iterating
    if (currentParagraphs) { 
      currentParagraphs.forEach((_, i) => {
        if (i >= indexToRemove) {
            setValue(`structuredContent.${i}.index`, i + 1, { shouldDirty: true });
        }
      });
    }
  };

  const onSubmit: SubmitHandler<UpdateModuleInput> = (data) => {
    console.log("Form data submitted for update:", data);
    // Zod validation is handled by the resolver
    mutation.mutate(data, {
      onSuccess: (updatedModule) => {
        console.log("Module updated successfully:", updatedModule);
        reset(updatedModule); // Reset form with the updated data to clear dirty state
        // Optionally redirect or show persistent success message
        // router.push('/admin/modules'); 
      },
      onError: (error) => {
        console.error("Module update failed:", error);
        // Error is already handled by the mutation hook's onError and displayed via toast
      }
    });
  };

  if (isLoadingModule) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /> Loading module data...</div>;
  }

  if (queryError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Module</AlertTitle>
        <AlertDescription>
          {queryError.message || "Could not load module data. Please try again later."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!moduleData) {
      return (
          <Alert variant="destructive">
              <AlertTitle>Module Not Found</AlertTitle>
              <AlertDescription>
                  The requested module could not be found.
              </AlertDescription>
          </Alert>
      );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Display mutation error (e.g., server-side validation) */}
      {mutation.error && (
        <Alert variant="destructive">
          <AlertTitle>Failed to Update Module</AlertTitle>
          <AlertDescription>
            {mutation.error.message || "An unexpected error occurred during the update."}
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Info Card (similar structure to Create Form) */} 
      <Card>
        <CardHeader>
          <CardTitle>Update Module Information</CardTitle>
          <CardDescription>Edit the details for this reading module.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {/* Title */} 
          <div className="grid gap-2 col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          {/* Description */} 
          <div className="grid gap-2 col-span-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          {/* Level */} 
          <div className="grid gap-2">
            <Label htmlFor="level">Reading Level</Label>
            <Controller
              name="level"
              control={control}
              render={({ field }) => (
                <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                  <SelectTrigger id="level"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {levelOptions.map(lvl => <SelectItem key={lvl} value={String(lvl)}>{lvl}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.level && <p className="text-sm text-destructive">{errors.level.message}</p>}
          </div>
          {/* Genre */} 
          <div className="grid gap-2">
            <Label htmlFor="genre">Genre</Label>
            <Controller
              name="genre"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="genre"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {genreOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.genre && <p className="text-sm text-destructive">{errors.genre.message}</p>}
          </div>
          {/* Language */} 
          <div className="grid gap-2">
            <Label htmlFor="language">Language</Label>
            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="language"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {languageOptions.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.language && <p className="text-sm text-destructive">{errors.language.message}</p>}
          </div>
          {/* Image URL */} 
          <div className="grid gap-2">
            <Label htmlFor="imageUrl">Image URL (Optional)</Label>
            <Input id="imageUrl" type="url" {...register('imageUrl')} />
            {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
          </div>
          {/* Estimated Reading Time */} 
          <div className="grid gap-2">
            <Label htmlFor="estimatedReadingTime">Est. Reading Time (Mins, Optional)</Label>
            <Controller
              name="estimatedReadingTime"
              control={control}
              render={({ field }) => (
                <Input
                  id="estimatedReadingTime"
                  type="number"
                  min="1"
                  {...field}
                  value={field.value ?? ''} // Display empty string if null/undefined
                  onChange={e => {
                    const value = e.target.value;
                    field.onChange(value === '' ? null : value); // Let Zod handle conversion
                  }}
                />
              )}
            />
            {errors.estimatedReadingTime && <p className="text-sm text-destructive">{errors.estimatedReadingTime.message}</p>}
          </div>
          {/* Status (Is Active) */} 
          <div className="flex items-center space-x-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="isActive">Published (Active)</Label>
            {errors.isActive && <p className="text-sm text-destructive">{errors.isActive.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Structured Content Card (similar structure to Create Form) */} 
      <Card>
        <CardHeader>
          <CardTitle>Module Content</CardTitle>
          <CardDescription>Add, edit, or remove paragraphs for this module.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start space-x-2 p-4 border rounded-md relative">
              <Label htmlFor={`structuredContent.${index}.text`} className="pt-2 font-mono text-sm text-muted-foreground">
                {`P${index + 1}`}
              </Label>
              <div className="flex-grow space-y-1">
                <Textarea
                  id={`structuredContent.${index}.text`}
                  {...register(`structuredContent.${index}.text`)}
                  rows={4}
                />
                {/* Display errors for text */}
                {errors.structuredContent?.[index]?.text && (
                    <p className="text-sm text-destructive">{errors.structuredContent[index]?.text?.message}</p>
                )}
                {/* Display errors for index (less common with automatic handling) */}
                {errors.structuredContent?.[index]?.index && (
                    <p className="text-sm text-destructive">{errors.structuredContent[index]?.index?.message}</p>
                )}
                {/* Hidden input for index if needed for validation or direct submission, but handled by logic above */}
                {/* <input type="hidden" {...register(`structuredContent.${index}.index`)} value={index + 1} /> */}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeParagraph(index)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                aria-label="Remove paragraph"
                // Disable remove if only one paragraph left and it's empty?
                // disabled={fields.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {/* Display root errors for the array (e.g., min length) */}
          {errors.structuredContent?.root && (
              <p className="text-sm text-destructive">{errors.structuredContent.root.message}</p>
          )}

          <Button type="button" variant="outline" onClick={addParagraph} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Paragraph
          </Button>
        </CardContent>
      </Card>
      
      {/* Submit Button */} 
      <div className="flex justify-end space-x-2">
         <Button variant="outline" type="button" onClick={() => router.back()} disabled={mutation.isPending}>
             Cancel
         </Button>
        <Button type="submit" disabled={!isDirty || isSubmitting || mutation.isPending}>
          {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
} 