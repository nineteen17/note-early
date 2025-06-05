'use client';

import React, { useState } from 'react';
import { useModuleQuery } from '@/hooks/api/shared/useModuleQuery';
import { useStudentProgressDetailsQuery } from '@/hooks/api/student/progress/useStudentProgressDetailsQuery';
import { useStartModuleMutation } from '@/hooks/api/student/progress/useStartModuleMutation';
import { useParagraphVocabularyQuery } from '@/hooks/api/reading-modules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StudentSkeleton } from '@/components/skeletons/StudentSkeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { BookOpen, Clock, AlignLeft, User, CheckCircle } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { format } from 'date-fns';

interface ModuleDetailsPageProps {
  params: Promise<{
    moduleId: string;
  }>;
}

export default function ModuleDetailsPage({ params }: ModuleDetailsPageProps) {
  const { moduleId } = use(params);
  const router = useRouter();
  const { data: module, isLoading: isModuleLoading, error: moduleError } = useModuleQuery(moduleId);
  const { data: progressDetails, isLoading: isProgressLoading } = useStudentProgressDetailsQuery(moduleId);
  const { data: vocabulary, isLoading: isVocabularyLoading } = useParagraphVocabularyQuery(moduleId, 1);
  const startModuleMutation = useStartModuleMutation();

  // Use real vocabulary data, limit to 4 words for UI consistency
  const displayVocabulary = vocabulary?.slice(0, 4) || [];

  // State for selected vocabulary word (default to first word)
  const [selectedVocabId, setSelectedVocabId] = useState<string>('');

  // Update selected vocab when vocabulary loads
  React.useEffect(() => {
    if (displayVocabulary.length > 0 && !selectedVocabId) {
      setSelectedVocabId(displayVocabulary[0].id);
    }
  }, [displayVocabulary, selectedVocabId]);

  const selectedVocab = displayVocabulary.find(vocab => vocab.id === selectedVocabId) || displayVocabulary[0];

  const handleStartModule = async () => {
    try {
      await startModuleMutation.mutateAsync({ moduleId });
      router.push(`/student/progress/${moduleId}/reading`);
    } catch (error) {
      console.error('Failed to start module:', error);
    }
  };

  if (isModuleLoading || isProgressLoading) {
    return <StudentSkeleton />;
  }

  if (moduleError || !module) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertDescription>
            {moduleError?.message || 'Failed to load module details. Please try again later.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const progress = progressDetails?.progress;
  const authorName = [module.authorFirstName, module.authorLastName].filter(Boolean).join(' ');

  return (
    <PageContainer>
      <div className="space-y-6">
        <Breadcrumb 
          items={[
            { label: 'Modules', href: '/student/modules' },
            { label: module.title }
          ]} 
        />

        {/* Main Module Card */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-2xl font-bold">{module.title}</CardTitle>
                  
                  {/* Progress Badge - Moved inside the title container */}
                  <div className="flex-shrink-0">
                    {progress && (
                      <Badge className={progress.completed ? "bg-success text-white" : "bg-secondary text-secondary-foreground"}>
                        {progress.completed ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {progress.completed ? 'Completed' : 'In Progress'}
                      </Badge>
                    )}
                    {!progress && (
                      <Badge variant="outline">Not Started</Badge>
                    )}
                  </div>
                </div>
                
                {/* Module Metadata Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Level {module.level}
                  </Badge>
                  
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    🎯 {module.genre}
                  </Badge>
                  
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <AlignLeft className="h-3 w-3 mr-1" />
                    {module.paragraphCount} paragraphs
                  </Badge>
                  
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    <Clock className="h-3 w-3 mr-1" />
                    {module.estimatedReadingTime || module.paragraphCount * 2} min
                  </Badge>
                  
                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                    🌍 {module.language === 'UK' ? 'British English' : 'American English'}
                  </Badge>
                  
                  {/* Module Type Badge - Show for both curated and custom */}
                  <Badge variant="outline" className={
                    module.type === 'curated' 
                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                      : "bg-pink-50 text-pink-700 border-pink-200"
                  }>
                    {module.type === 'curated' ? '⭐ Curated' : '✨ Custom'}
                  </Badge>
                </div>

                {/* Author Information with proper empty state handling */}
                {authorName ? (
                  <CardDescription className="flex items-center gap-2 text-sm mt-3">
                    <User className="h-4 w-4" />
                    by {authorName}
                  </CardDescription>
                ) : (
                  <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                    <User className="h-4 w-4" />
                    Author information not available
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* Module Description */}
              <div className="prose dark:prose-invert max-w-none">
                {module.description ? (
                  <p className="text-lg leading-relaxed">{module.description}</p>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground italic">No description available for this module.</p>
                  </div>
                )}
              </div>

              {/* Story Preview with Vocabulary */}
              {module.structuredContent && module.structuredContent.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Module Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <blockquote className="text-sm leading-relaxed italic text-foreground/90 border-l-4 border-accent bg-[rgba(254,172,62,0.1)] pl-4 py-3 rounded-r-lg mb-4">
                      &ldquo;{module.structuredContent[0].text.substring(0, 200)}
                      {module.structuredContent[0].text.length > 200 ? '...' : ''}&rdquo;
                    </blockquote>
                    
                    {/* Vocabulary Preview - Clean and Simple */}
                    {!isVocabularyLoading && displayVocabulary && displayVocabulary.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="text-sm font-medium text-foreground mb-3">
                          Key Vocabulary
                        </h4>
                        <div className="flex flex-wrap gap-2 items-center">
                          {displayVocabulary.map((vocab) => (
                            <button
                              key={vocab.id}
                              onClick={() => setSelectedVocabId(vocab.id)}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                selectedVocabId === vocab.id
                                  ? 'bg-accent text-accent-foreground border border-border'
                                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                              }`}
                            >
                              {vocab.word}
                            </button>
                          ))}
                          {vocabulary && vocabulary.length > displayVocabulary.length && (
                            <span className="text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded-full border border-muted/30">
                              +{vocabulary.length - displayVocabulary.length} more
                            </span>
                          )}
                        </div>
                        
                        {/* Selected word description */}
                        {selectedVocab && (
                          <div className="mt-3 p-3 bg-accent/30 border border-accent/50 rounded-md">
                            <p className="text-sm text-foreground/90">
                              <span className="font-medium">{selectedVocab.word}:</span> {selectedVocab.description}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Vocabulary Loading State */}
                    {isVocabularyLoading && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="text-sm font-medium text-foreground mb-3">
                          Key Vocabulary
                        </h4>
                        <div className="text-center py-2">
                          <p className="text-xs text-muted-foreground">Loading vocabulary...</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Story Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <p className="text-muted-foreground italic">Story content will be available when you start reading.</p>
                    </div>
                    
                    {/* Vocabulary Preview for no content case */}
                    {!isVocabularyLoading && displayVocabulary && displayVocabulary.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="text-sm font-medium text-foreground mb-3">
                          Key Vocabulary
                        </h4>
                        <div className="flex flex-wrap gap-2 items-center">
                          {displayVocabulary.map((vocab) => (
                            <button
                              key={vocab.id}
                              onClick={() => setSelectedVocabId(vocab.id)}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                selectedVocabId === vocab.id
                                  ? 'bg-accent text-accent-foreground border border-border'
                                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                              }`}
                            >
                              {vocab.word}
                            </button>
                          ))}
                          {vocabulary && vocabulary.length > displayVocabulary.length && (
                            <span className="text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded-full border border-muted/30">
                              +{vocabulary.length - displayVocabulary.length} more
                            </span>
                          )}
                        </div>
                        
                        {/* Selected word description */}
                        {selectedVocab && (
                          <div className="mt-3 p-3 bg-accent/30 border border-accent/50 rounded-md">
                            <p className="text-sm text-foreground/90">
                              <span className="font-medium">{selectedVocab.word}:</span> {selectedVocab.description}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Vocabulary Loading State */}
                    {isVocabularyLoading && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="text-sm font-medium text-foreground mb-3">
                          Key Vocabulary
                        </h4>
                        <div className="text-center py-2">
                          <p className="text-xs text-muted-foreground">Loading vocabulary...</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Progress Information - More compact */}
              {progress && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Your Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Started</p>
                        <p className="text-sm font-semibold text-foreground">
                          {format(new Date(progress.startedAt || progress.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">Time Invested</p>
                        <p className="text-sm font-semibold text-foreground">
                          {progress.timeSpentMinutes && progress.timeSpentMinutes > 0 
                            ? `${progress.timeSpentMinutes} min`
                            : progress.completed 
                              ? 'Complete'
                              : 'Just started'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Action Button - Proper placement at bottom */}
              <div className="flex justify-center pt-2">
                {progress ? (
                  <Button 
                    onClick={() => router.push(`/student/progress/${moduleId}/reading`)}
                    size="lg"
                    className="w-full sm:w-auto min-w-[200px]"
                  >
                    {progress.completed ? 'Review Module' : 'Continue Reading'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartModule}
                    disabled={startModuleMutation.isPending}
                    size="lg"
                    className="w-full sm:w-auto min-w-[200px]"
                  >
                    {startModuleMutation.isPending ? 'Starting...' : 'Start Module'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
     </div>
    </PageContainer>
  );
} 