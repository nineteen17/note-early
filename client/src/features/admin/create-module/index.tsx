'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { createModuleSchema, CreateModuleInput } from '@/lib/schemas/modules';
import { useCreateModuleMutation } from '@/hooks/api/admin/modules/useCreateModuleMutation';
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
import type { SubmitHandler } from 'react-hook-form';
import { ZodError } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

// Define options based on schema enums
const levelOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
type ModuleLevel = typeof levelOptions[number];

const genreOptions = ["History", "Adventure", "Science", "Non-Fiction", "Fantasy", "Biography", "Mystery", "Science-Fiction", "Folktale", "Custom"] as const;
const languageOptions = ["UK", "US"] as const;

export function AdminCreateModule() {
  const router = useRouter();
  const mutation = useCreateModuleMutation();

  const form = useForm({
    resolver: zodResolver(createModuleSchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      description: null, // Match schema (nullable)
      level: 1, 
      genre: 'Custom',
      language: 'UK',
      imageUrl: null, // Match schema (nullable)
      estimatedReadingTime: null, // Default to null for optional number
      isActive: true,
      structuredContent: [{ index: 1, text: '' }], // Start with one paragraph
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "structuredContent",
    keyName: "id", // Use 'id' as the key, default is 'id'
  });

  // Function to add a new paragraph, automatically setting the next index
  const addParagraph = () => {
    const nextIndex = fields.length + 1;
    // Ensure the new item matches the expected type within CreateModuleInput
    append({ index: nextIndex, text: '' } as { index: number; text: string }); // Keep explicit type here for append if needed
  };
  
  // Function to remove a paragraph and update subsequent indices
  const removeParagraph = (indexToRemove: number) => {
      // Get current paragraphs *before* removal to capture the full state
      const currentParagraphs = form.watch('structuredContent');
      remove(indexToRemove); // Perform the removal

      // Update indices of subsequent paragraphs using setValue on the *new* state after removal
      // Note: RHF `remove` might re-index automatically depending on version/setup,
      // but manual adjustment ensures consistency if needed. Let's test without manual update first.
      // If manual update is required:
      // const updatedParagraphs = watch('structuredContent'); // Get state *after* remove
      // updatedParagraphs.forEach((paragraph, i) => {
      //     setValue(`structuredContent.${i}.index`, i + 1); // Avoid immediate validation loops
      // });
  };

  // onSubmit receives validated data directly thanks to zodResolver
  const onSubmit: SubmitHandler<CreateModuleInput> = (data) => {
    console.log("Validated form data received by onSubmit:", data);

    // Call mutation directly with the validated data from RHF,
    // but assert the level type for TypeScript
    mutation.mutate({ 
        ...data,
        level: data.level as ModuleLevel // Re-add type assertion for level
    }, {
      onSuccess: (newModule) => {
        console.log("Module created successfully:", newModule);
        toast.success(`Module "${newModule.title}" created successfully!`);
        form.reset(); // Reset form
        router.push('/admin/modules');
      },
      onError: (error) => {
        console.error("Module creation failed:", error);
        // Error is already displayed via mutation.error in the Alert component
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Module</CardTitle>
        <CardDescription>
          Fill in the details for your new custom reading module.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CardContent className="space-y-4">
            {/* General Form Error - Display RHF errors, including manually set ones */}
            {mutation.error && (
                <Alert variant="destructive">
                <AlertTitle>Failed to Create Module</AlertTitle>
                <AlertDescription>
                    {mutation.error.message || "An unexpected error occurred."} 
                </AlertDescription>
                </Alert>
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., The Mystery of the Missing Key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Structured Content */}
            <FormField
              control={form.control}
              name="structuredContent"
              render={({ field }) => {
                  console.log('Fields Array:', fields); 
                  return (
                    <FormItem> 
                      <FormLabel>Module Content</FormLabel> 
                      
                      {/* --- Restore fields.map() --- */}
                      {fields.map((paragraph, index) => (
                        <div key={paragraph.id} className="flex items-start space-x-2 p-4 border rounded-md relative mt-2"> {/* Added mt-2 for spacing */} 
                          <Label htmlFor={`structuredContent.${index}.text`} className="pt-2 font-mono text-sm text-muted-foreground">
                            {`P${index + 1}`}
                          </Label>
                          <div className="flex-grow space-y-1">
                            <Textarea
                              id={`structuredContent.${index}.text`}
                              {...form.register(`structuredContent.${index}.text`)}
                              rows={4}
                              placeholder={`Enter text for paragraph ${index + 1}...`}
                              className="w-full"
                            />
                            {form.formState.errors.structuredContent?.[index]?.text && <p className="text-sm text-destructive">{form.formState.errors.structuredContent[index]?.text?.message}</p>}
                          </div>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeParagraph(index)}
                              className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                              aria-label="Remove paragraph"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))} 
                      {/* --- END Restore fields.map() --- */}

                      {/* --- Restore Button location --- */} 
                      <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2" 
                          onClick={addParagraph}
                      >
                         <PlusCircle className="mr-2 h-4 w-4" />
                         Add Paragraph
                      </Button>

                      <FormDescription> 
                        Each block of text separated by an empty line will become a numbered paragraph.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Level */}
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {levelOptions.map(lvl => <SelectItem key={lvl} value={String(lvl)}>{lvl}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Genre */}
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genreOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Language */}
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languageOptions.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief summary of the module."
                      {...field}
                      value={field.value ?? ''} // Handle potential null/undefined for optional field
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image URL */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                      value={field.value ?? ''} // Handle potential null/undefined for optional field
                    />
                  </FormControl>
                  <FormDescription>
                    A direct link to an image representing the module.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estimated Reading Time */}
            <FormField
              control={form.control}
              name="estimatedReadingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Est. Reading Time (Mins, Optional)</FormLabel>
                  <FormControl>
                    <Input
                      id="estimatedReadingTime"
                      type="number"
                      min="1"
                      {...field}
                      value={field.value === null || field.value === undefined ? '' : String(field.value)}
                      onChange={e => {
                        const value = e.target.value;
                        // --- CORRECTED: Explicitly parse to number or null --- 
                        if (value === '') {
                          field.onChange(null); // Pass null if empty (for optional field)
                        } else {
                          const num = parseInt(value, 10); // Parse as base-10 integer
                          // Pass number if valid, otherwise null (or handle invalid input differently if needed)
                          field.onChange(isNaN(num) ? null : num); 
                        }
                      }}
                      placeholder="e.g., 15"
                    />
                  </FormControl>
                  {form.formState.errors.estimatedReadingTime && <FormMessage />}
                </FormItem>
              )}
            />

            {/* Is Active Checkbox */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Active
                    </FormLabel>
                    <FormDescription>
                      Make this module immediately available to students.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting || mutation.isPending}>
              {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Module'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 