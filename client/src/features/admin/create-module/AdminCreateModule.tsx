'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { createModuleSchema, CreateModuleInput } from '@/lib/schemas/modules';
import { useCreateModuleMutation } from '@/hooks/api/admin/modules/useCreateModuleMutation';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
import { Loader2, PlusCircle, Trash2, BookOpen, FileText, Tag, Globe, Image, Clock, Settings, Eye, Check, ChevronRight, ChevronLeft, AlertCircle, Lock } from 'lucide-react';
import type { SubmitHandler } from 'react-hook-form';
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Define options based on schema enums
const levelOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
type ModuleLevel = typeof levelOptions[number];

const genreOptions = ["History", "Adventure", "Science", "Non-Fiction", "Fantasy", "Biography", "Mystery", "Science-Fiction", "Folktale", "Custom"] as const;
const languageOptions = ["UK", "US"] as const;

// Define vocabulary schema
const vocabularySchema = z.object({
  paragraphIndex: z.number().int().positive('Paragraph index must be a positive integer'),
  word: z.string().min(1, 'Word cannot be empty').max(100, 'Word cannot exceed 100 characters'),
  description: z.string().min(1, 'Description cannot be empty').max(1000, 'Description cannot exceed 1000 characters'),
});

// Extend the createModuleSchema to include vocabulary
const extendedCreateModuleSchema = createModuleSchema.extend({
  vocabulary: z.array(vocabularySchema).optional(),
});

// Define form steps
const steps = [
  {
    id: 'basics',
    title: 'Basic Information',
    description: 'Set up the core details for your module',
    icon: FileText,
    fields: ['title', 'description', 'level', 'genre', 'language']
  },
  {
    id: 'content',
    title: 'Module Content',
    description: 'Create the reading material',
    icon: BookOpen,
    fields: ['structuredContent']
  },
  {
    id: 'vocabulary',
    title: 'Vocabulary Support',
    description: 'Add word definitions (optional)',
    icon: Tag,
    fields: ['vocabulary']
  },
  {
    id: 'settings',
    title: 'Final Settings',
    description: 'Configure additional options',
    icon: Settings,
    fields: ['imageUrl', 'estimatedReadingTime', 'isActive']
  }
];

interface AdminCreateModuleProps {
  currentModuleCount?: number;
  customModuleLimit?: number;
  userPlanTier?: string;
  currentPlan?: any;
  isLimitReached?: boolean;
}

export function AdminCreateModule({ 
  currentModuleCount = 0, 
  customModuleLimit = 0, 
  userPlanTier = 'free',
  currentPlan,
  isLimitReached = false
}: AdminCreateModuleProps) {
  const router = useRouter();
  const mutation = useCreateModuleMutation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(extendedCreateModuleSchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      description: null,
      level: 1,
      genre: 'Adventure',
      language: 'UK',
      imageUrl: null,
      estimatedReadingTime: null,
      isActive: true,
      structuredContent: [{ index: 1, text: '' }],
      vocabulary: [],
    },
  });

  const { fields: paragraphFields, append: appendParagraph, remove: removeParagraph } = useFieldArray({
    control: form.control,
    name: "structuredContent",
    keyName: "id",
  });

  const { fields: vocabularyFields, append: appendVocabulary, remove: removeVocabulary } = useFieldArray({
    control: form.control,
    name: "vocabulary",
    keyName: "id",
  });

  const addParagraph = () => {
    const nextIndex = paragraphFields.length + 1;
    appendParagraph({ index: nextIndex, text: '' });
  };

  const addVocabulary = () => {
    appendVocabulary({
      paragraphIndex: 1,
      word: '',
      description: '',
    });
  };

  // Validate current step
  const validateStep = async (stepIndex: number) => {
    const stepFields = steps[stepIndex].fields;
    
    // For vocabulary step, validation is optional - always return true
    if (stepIndex === 2) {
      return true;
    }
    
    const isValid = await form.trigger(stepFields as any);
    return isValid;
  };

  const nextStep = async (e?: React.MouseEvent) => {
    // Prevent any default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (e?: React.MouseEvent) => {
    // Prevent any default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepCompleted = (stepIndex: number) => {
    if (stepIndex > currentStep) return false;
    const stepFields = steps[stepIndex].fields;
    
    // Check if required fields in this step have values
    const formValues = form.getValues();
    return stepFields.every(field => {
      const value = formValues[field as keyof typeof formValues];
      if (field === 'structuredContent') {
        return Array.isArray(value) && value.length > 0 && value[0]?.text?.trim();
      }
      if (field === 'title') {
        return typeof value === 'string' && value.trim().length > 0;
      }
      // Optional fields don't need to be completed
      if (['description', 'imageUrl', 'estimatedReadingTime', 'vocabulary'].includes(field)) {
        return true;
      }
      return value !== null && value !== undefined && value !== '';
    });
  };

  const onSubmit: SubmitHandler<CreateModuleInput> = (data) => {
    // Only submit if we're on the final step
    if (currentStep !== steps.length - 1) {
      return;
    }
    
    // Prevent multiple submissions with local state
    if (isSubmitting || mutation.isPending) {
      return;
    }

    setIsSubmitting(true);
    
    mutation.mutate({ 
      ...data,
      level: data.level as ModuleLevel
    }, {
      onSuccess: (newModule) => {
        // Single success toast
        toast.success(`Module "${newModule.title}" created successfully!`);
        form.reset();
        setIsSubmitting(false);
        router.push('/admin/modules');
      },
      onError: (error) => {
        console.error("Module creation failed:", error);
        toast.error(error.message || "Failed to create module. Please try again.");
        setIsSubmitting(false);
      },
      onSettled: () => {
        // Ensure we always reset the submitting state
        setIsSubmitting(false);
      }
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Module Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., The Mystery of the Missing Key" 
                      className="h-11 border-border/50 focus:border-primary transition-colors"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a brief, engaging summary of the module content..."
                      className="min-h-[100px] border-border/50 focus:border-primary transition-colors resize-none"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    This description will help students understand what to expect from the module
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Reading Level
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-border/50">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {levelOptions.map(lvl => (
                          <SelectItem key={lvl} value={String(lvl)}>Level {lvl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Genre
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-border/50">
                          <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genreOptions.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Language
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-border/50">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languageOptions.map(lang => (
                          <SelectItem key={lang} value={lang}>{lang === 'UK' ? 'British English' : 'American English'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 1: // Module Content
        return (
          <FormField
            control={form.control}
            name="structuredContent"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-4">
                  {paragraphFields.map((paragraph, index) => (
                    <div key={paragraph.id} className="group relative">
                      <div className="flex items-start gap-4 p-6 border border-border/50 rounded-lg bg-card/50 hover:bg-card transition-colors">
                        <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-sm font-semibold">P{index + 1}</span>
                        </div>
                        <div className="flex-grow space-y-2">
                          <Label htmlFor={`structuredContent.${index}.text`} className="text-sm font-medium">
                            Paragraph {index + 1}
                          </Label>
                          <Textarea
                            id={`structuredContent.${index}.text`}
                            {...form.register(`structuredContent.${index}.text`)}
                            rows={4}
                            placeholder={`Write the content for paragraph ${index + 1}...`}
                            className="border-border/50 focus:border-primary transition-colors resize-none"
                          />
                          {form.formState.errors.structuredContent?.[index]?.text && (
                            <p className="text-sm text-destructive">
                              {form.formState.errors.structuredContent[index]?.text?.message}
                            </p>
                          )}
                        </div>
                        {paragraphFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeParagraph(index)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            aria-label="Remove paragraph"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-dashed border-border/50 hover:border-primary hover:bg-primary/5 transition-all"
                    onClick={addParagraph}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Paragraph
                  </Button>
                </div>
                <FormDescription className="mt-3 text-sm text-muted-foreground">
                  Break your content into digestible paragraphs. Each paragraph will be numbered for easy reference.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 2: // Vocabulary Support
        return (
          <FormField
            control={form.control}
            name="vocabulary"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-4">
                  {vocabularyFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No vocabulary entries yet</p>
                      <p className="text-sm">Add definitions for challenging words to help students</p>
                    </div>
                  )}
                  
                  {vocabularyFields.map((vocab, index) => (
                    <div key={vocab.id} className="group relative">
                      <div className="p-6 border border-border/50 rounded-lg bg-card/50 hover:bg-card transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium">Vocabulary Entry {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVocabulary(index)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Remove vocabulary entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <FormField
                            control={form.control}
                            name={`vocabulary.${index}.paragraphIndex`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Paragraph Reference</FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={(value) => field.onChange(Number(value))}
                                    defaultValue={String(field.value)}
                                  >
                                    <SelectTrigger className="h-11 border-border/50">
                                      <SelectValue placeholder="Select paragraph" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: paragraphFields.length }, (_, i) => i + 1).map(num => (
                                        <SelectItem key={num} value={String(num)}>
                                          Paragraph {num}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormDescription>Which paragraph contains this word?</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vocabulary.${index}.word`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Word</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter the challenging word..." 
                                    className="h-11 border-border/50 focus:border-primary transition-colors"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`vocabulary.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Definition</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Provide a clear, student-friendly definition..."
                                  className="border-border/50 focus:border-primary transition-colors resize-none"
                                  {...field}
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-dashed border-border/50 hover:border-primary hover:bg-primary/5 transition-all"
                    onClick={addVocabulary}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Vocabulary Entry
                  </Button>
                </div>
                <FormDescription className="mt-3 text-sm text-muted-foreground">
                  Help students understand difficult words by providing clear definitions linked to specific paragraphs. This step is optional.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 3: // Final Settings
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Cover Image URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/image.jpg"
                        className="h-11 border-border/50 focus:border-primary transition-colors"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Add a visual representation to make your module more engaging
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedReadingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Reading Time (Minutes)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        className="h-11 border-border/50 focus:border-primary transition-colors"
                        {...field}
                        value={field.value === null || field.value === undefined ? '' : String(field.value)}
                        onChange={e => {
                          const value = e.target.value;
                          field.onChange(value === '' ? null : parseInt(value, 10));
                        }}
                        placeholder="e.g., 15"
                      />
                    </FormControl>
                    <FormDescription>
                      Help students plan their reading time
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-card/30">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Module Visibility
                      </FormLabel>
                      <FormDescription className="text-sm">
                        Make this module immediately available to students
                      </FormDescription>
                    </div>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm ${field.value ? 'text-success' : 'text-muted-foreground'}`}>
                          {field.value ? 'Active' : 'Draft'}
                        </span>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                        />
                      </div>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Calculate remaining modules
  const remainingModules = Math.max(0, customModuleLimit - currentModuleCount);
  const isApproachingLimit = remainingModules <= 1 && remainingModules > 0;

  return (
    <div className="space-y-8">
      {/* Module Limit Info */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Module Creation Status</h3>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">
                  {currentModuleCount}
                  <span className="text-sm font-normal text-muted-foreground">
                    {customModuleLimit === 999999 ? ' of unlimited' : ` of ${customModuleLimit}`}
                  </span>
                </div>
                <div className="flex-1 max-w-xs">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Modules Created </span>
                    {customModuleLimit !== 999999 && (
                      <span>&nbsp;{Math.round((currentModuleCount / customModuleLimit) * 100)}%</span>
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={cn(
                        "h-2 rounded-full transition-all",
                        isLimitReached ? "bg-destructive" : isApproachingLimit ? "bg-warning" : "bg-success"
                      )}
                      style={{ 
                        width: customModuleLimit === 999999 
                          ? '20%' 
                          : `${Math.min(100, (currentModuleCount / customModuleLimit) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
                userPlanTier === 'free' 
                  ? "bg-muted text-muted-foreground"
                  : userPlanTier === 'home'
                    ? "bg-blue-accent/90 text-foreground"
                    : "bg-secondary/90 text-secondary"
              )}>
                {userPlanTier === 'free' ? 'Free Plan' : 
                 userPlanTier === 'home' ? 'Home Plan' : 'Pro Plan'}
              </div>
              {!isLimitReached && remainingModules < 999999 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {remainingModules} remaining
                </p>
              )}
            </div>
          </div>
          
          {/* Status Messages */}
          {isLimitReached && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Module Limit Reached</AlertTitle>
              <AlertDescription>
                You've reached your {userPlanTier} plan limit of {customModuleLimit} custom modules. 
                {userPlanTier !== 'pro' && ' Consider upgrading to create more modules.'}
              </AlertDescription>
            </Alert>
          )}
          
          {isApproachingLimit && (
            <Alert className="mt-4 border-warning/50 bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertTitle className="text-foreground">Approaching Limit</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                You have {remainingModules} module{remainingModules !== 1 ? 's' : ''} remaining on your {userPlanTier} plan.
                {userPlanTier !== 'pro' && ' Consider upgrading for more modules.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {mutation.error && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTitle className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
              <div className="h-2 w-2 bg-white rounded-full" />
            </div>
            Module Creation Failed
          </AlertTitle>
          <AlertDescription className="mt-2">
            {mutation.error.message || "An unexpected error occurred. Please try again."}
          </AlertDescription>
        </Alert>
      )}

      {/* Step Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = isStepCompleted(index);
          const isAccessible = index <= currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "relative p-4 rounded-lg border transition-all cursor-pointer",
                isActive 
                  ? "border-accent bg-accent/5" 
                  : isCompleted 
                    ? "border-green-200 bg-green-50 hover:bg-green-100" 
                    : isAccessible
                      ? "border-border/50 bg-card hover:bg-card/80"
                      : "border-border/30 bg-muted/30 opacity-60 cursor-not-allowed"
              )}
              onClick={() => isAccessible && setCurrentStep(index)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  isActive 
                    ? "bg-accent text-accent-foreground" 
                    : isCompleted 
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-popover-foreground" : isCompleted ? "text-green-700" : "text-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Current Step Content */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-8">
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="h-11 px-6"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => router.push('/admin/modules')}
                className="h-11 px-6"
              >
                Cancel
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={form.formState.isSubmitting || mutation.isPending || isSubmitting}
                  className="h-11 px-6"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={form.formState.isSubmitting || mutation.isPending || isLimitReached || isSubmitting}
                  className="h-11 px-8"
                >
                  {(mutation.isPending || isSubmitting) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Module...
                    </>
                  ) : isLimitReached ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Limit Reached
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Create Module
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}