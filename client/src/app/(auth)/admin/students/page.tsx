'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAdminStudentsQuery } from '@/hooks/api/admin/students/useAdminStudentsQuery';
import { useAdminStudentProgressListQuery } from '@/hooks/api/admin/progress/useAdminStudentProgressListQuery';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, AlertCircle, Users, Trash2, Search, MessageSquare } from 'lucide-react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';
import { format } from 'date-fns';
import { CreateStudentModal } from '@/features/admin/create-student-modal';
import { ProfileDTO } from '@/types/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";


interface StudentListTableProps {
  students: ProfileDTO[];
  onCreateClick: () => void;
}

function StudentListTable({ students, onCreateClick }: StudentListTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleRowClick = (profileId: string) => {
    router.push(`/admin/students/${profileId}`);
  };

  const filteredStudents = students.filter(student => 
    student.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.profileId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
        <Button onClick={onCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Student
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead className="hidden sm:table-cell">Reading Level</TableHead>
              <TableHead className="hidden md:table-cell">Completed Modules</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead className="text-center">Awaiting Marking</TableHead>
              <TableHead className="text-right"><span className="sr-only">View Profile</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {searchQuery ? 'No students found matching your search.' : 'No students found. Get started by creating one!'}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <StudentRow 
                  key={student.profileId} 
                  student={student} 
                  onRowClick={() => handleRowClick(student.profileId)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface StudentRowProps {
  student: ProfileDTO;
  onRowClick: () => void;
}

function StudentRow({ student, onRowClick }: StudentRowProps) {
  const { data: progressList } = useAdminStudentProgressListQuery(student.profileId);


  const awaitingMarkingCount = progressList?.filter(progress => 
    progress.completed && (!progress.score || !progress.teacherFeedback)
  ).length ?? 0;

  return (
    <TableRow 
      onClick={onRowClick}
      className="cursor-pointer hover:bg-[var(--blue-accent)]/25 transition-colors"
    >
      <TableCell>
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={student.avatarUrl ?? undefined} alt={student.fullName ?? 'Student'} />
          <AvatarFallback>{getInitials(student.fullName ?? 'S')}</AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell className="font-medium">
        {student.fullName}
      </TableCell>
      <TableCell className="hidden sm:table-cell">{student.readingLevel ?? 'N/A'}</TableCell>
      <TableCell className="hidden md:table-cell">{student.completedModulesCount ?? 0}</TableCell>
      <TableCell className="hidden md:table-cell">{student.createdAt ? format(new Date(student.createdAt), 'PP') : 'N/A'}</TableCell>
      <TableCell className="text-center">
        {awaitingMarkingCount > 0 ? (
          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
            <MessageSquare className="h-3 w-3 mr-1" />
            {awaitingMarkingCount}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
      </TableCell>
    </TableRow>
  );
}

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const { data: students, isLoading, isError, error } = useAdminStudentsQuery(); 
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }); 
  };

  return (
    <PageContainer>
      <PageHeader
        title="Students"
        description="View and manage student profiles associated with your account."
      />

      {isLoading && (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3 mt-1" />
                </div>
                <Skeleton className="h-10 w-32" />
            </CardHeader>
            <CardContent>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 py-4 border-b last:border-b-0">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-1/4 hidden sm:block" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
      )}

      {isError && !isLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Students</AlertTitle>
          <AlertDescription>
            {error?.message || "Could not load the student list. Please try again."}
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && students && (
        <StudentListTable 
          students={students} 
          onCreateClick={() => setIsCreateModalOpen(true)}
        />
      )}

      <CreateStudentModal 
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
      />
    </PageContainer>
  );
} 