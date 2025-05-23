'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAdminStudentsQuery } from '@/hooks/api/admin/students/useAdminStudentsQuery';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, AlertCircle, Users, Trash2 } from 'lucide-react';
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

// Define props for the table, including edit handler
interface StudentListTableProps {
  students: ProfileDTO[];
}

function StudentListTable({ students }: StudentListTableProps) {
  const router = useRouter();

  const handleRowClick = (profileId: string) => {
    router.push(`/admin/students/${profileId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Managed Students</CardTitle>
        <CardDescription>View and manage student profiles associated with your account.</CardDescription>
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
              <TableHead className="text-right"><span className="sr-only">View Profile</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No students found. Get started by creating one!
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow 
                  key={student.profileId} 
                  onClick={() => handleRowClick(student.profileId)}
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
                  {/* Empty cell for alignment, corresponding to the sr-only header */}
                  <TableCell className="text-right">
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <Users className="mr-3 h-7 w-7" /> Students
        </h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Student
        </Button>
      </div>

      {isLoading && (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3 mt-1" />
            </CardHeader>
            <CardContent>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 py-4 border-b last:border-b-0">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-1/4 hidden sm:block" />
                        </div>
                        {/* Skeleton for the removed actions column? - Keep layout consistent */}
                        {/* <Skeleton className="h-8 w-16" /> */} 
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
        <StudentListTable students={students} />
      )}

      <CreateStudentModal 
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
      />
    </div>
  );
} 