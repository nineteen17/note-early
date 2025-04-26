'use client';

import React, { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAdminStudentQuery } from '@/hooks/api/admin/students/useAdminStudentQuery';
import { useActiveModulesQuery } from '@/hooks/api/readingModules/useActiveModulesQuery';
import { useAdminModuleProgressQuery } from '@/hooks/api/admin/progress/useAdminModuleProgressQuery';
import type { StudentProgressSchema, ReadingModuleDTO } from '@/types/api';
import { api, ApiError } from '@/lib/apiClient';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AdminUpdateProgressModal } from './AdminUpdateProgressModal';

interface AdminStudentDetailProps {
    profileId: string;
}

function StudentProgressTable({ progressRecords, moduleTitles }: {
    progressRecords: StudentProgressSchema[];
    moduleTitles: Record<string, string>;
}) {
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedProgress, setSelectedProgress] = useState<StudentProgressSchema | null>(null);

    const handleOpenUpdateModal = (progress: StudentProgressSchema) => {
        setSelectedProgress(progress);
        setIsUpdateModalOpen(true);
    };

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Feedback</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {progressRecords.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                No progress records found for this student.
                            </TableCell>
                        </TableRow>
                    )}
                    {progressRecords.map((progress) => (
                        <TableRow key={progress.id}>
                            <TableCell className="font-medium">{moduleTitles[progress.moduleId] || 'Unknown Module'}</TableCell>
                            <TableCell>{progress.completed ? 'Completed' : 'In Progress'}</TableCell>
                            <TableCell>{progress.score ?? '-'}</TableCell>
                            <TableCell>{progress.startedAt ? new Date(progress.startedAt).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>{progress.completedAt ? new Date(progress.completedAt).toLocaleDateString() : '-'}</TableCell>
                            <TableCell className="truncate max-w-[150px]" title={progress.teacherFeedback ?? 'No feedback'}>{progress.teacherFeedback || '-'}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleOpenUpdateModal(progress)}>
                                    Update
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {selectedProgress && (
                <AdminUpdateProgressModal 
                    isOpen={isUpdateModalOpen} 
                    onClose={() => setIsUpdateModalOpen(false)} 
                    progressRecord={selectedProgress} 
                    moduleId={selectedProgress.moduleId}
                />
            )}
        </>
    );
}

export function AdminStudentDetail({ profileId }: AdminStudentDetailProps) {

    const { data: student, isLoading: isLoadingStudent, error: studentError } = useAdminStudentQuery(profileId);

    const { data: activeModules, isLoading: isLoadingModules, error: modulesError } = useActiveModulesQuery();

    const moduleProgressQueries = useQueries({
        queries: (activeModules ?? []).map((module: ReadingModuleDTO) => ({
            queryKey: ['adminModuleProgress', module.id] as const,
            queryFn: () => api.get<StudentProgressSchema[]>(`/progress/admin/module/${module.id}`),
            staleTime: 5 * 60 * 1000,
            enabled: !!activeModules,
        })),
    });

    const isLoadingProgress = moduleProgressQueries.some(query => query.isLoading);
    const progressError = moduleProgressQueries.find(query => query.error)?.error;
    const progressErrorMessage = progressError instanceof ApiError ? progressError.message : (progressError as Error)?.message;

    const studentProgressRecords = React.useMemo(() => {
        if (isLoadingStudent || isLoadingModules || isLoadingProgress || !student) {
            return [];
        }
        const allProgress = moduleProgressQueries
            .filter(query => query.isSuccess && query.data)
            .flatMap(query => query.data as StudentProgressSchema[]);
        
        return allProgress.filter(progress => progress.studentId === student.id);

    }, [moduleProgressQueries, student, isLoadingStudent, isLoadingModules, isLoadingProgress]);

    const moduleTitles = React.useMemo(() => {
        if (!activeModules) return {};
        return activeModules.reduce((acc, module: ReadingModuleDTO) => {
            acc[module.id] = module.title;
            return acc;
        }, {} as Record<string, string>);
    }, [activeModules]);

    const isLoading = isLoadingStudent || isLoadingModules || isLoadingProgress;
    const error = studentError || modulesError || progressError;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-60">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    if (studentError) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error Loading Student</AlertTitle>
                <AlertDescription>{studentError.message}</AlertDescription>
            </Alert>
        );
    }
    if (!student) {
        return (
            <Alert variant="default">
                <AlertTitle>Student Not Found</AlertTitle>
                <AlertDescription>The requested student profile could not be found.</AlertDescription>
            </Alert>
        );
    }

    const getInitials = (name: string | null | undefined) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={student.avatarUrl ?? undefined} alt={student.fullName ?? 'Student Avatar'} />
                                <AvatarFallback>{getInitials(student.fullName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl">{student.fullName || 'Unnamed Student'}</CardTitle>
                                <CardDescription>ID: {student.id}</CardDescription>
                                {student.age && <CardDescription>Age: {student.age}</CardDescription>}
                                {student.readingLevel && <CardDescription>Reading Level: {student.readingLevel}</CardDescription>}
                            </div>
                        </div>
                        <div>
                            <Button variant="outline" size="sm">
                                <Edit className="mr-2 h-4 w-4" /> Edit Profile
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle>Module Progress</CardTitle>
                    <CardDescription>Overview of the student's progress across assigned modules.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingProgress && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                             <Loader2 className="animate-spin h-4 w-4" />
                             <span>Loading progress...</span>
                        </div>
                    )}
                    {progressError && (
                        <Alert variant="destructive">
                            <AlertTitle>Error Loading Progress</AlertTitle>
                            <AlertDescription>{progressErrorMessage || 'An unknown error occurred'}</AlertDescription>
                        </Alert>
                    )}
                    {!isLoadingProgress && !progressError && (
                        <StudentProgressTable 
                            progressRecords={studentProgressRecords} 
                            moduleTitles={moduleTitles} 
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
