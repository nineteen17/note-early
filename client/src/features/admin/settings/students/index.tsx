'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// TODO: Import hook to fetch students later (e.g., useGetManagedStudentsQuery)
// TODO: Import types for Student later

// Placeholder student data structure - adjust as needed
interface StudentPlaceholder {
  id: string;
  name: string;
  age: number;
  level: number;
  avatarUrl: string;
}

export function StudentSettingsTab() {
  // TODO: Fetch actual student data using a hook
  const students: StudentPlaceholder[] = [
    { id: '1', name: 'Emma', age: 8, level: 3, avatarUrl: 'https://via.placeholder.com/150/f66b97' }, // Placeholder avatars
    { id: '2', name: 'Liam', age: 10, level: 5, avatarUrl: 'https://via.placeholder.com/150/56a8c2' },
    { id: '3', name: 'Olivia', age: 7, level: 2, avatarUrl: 'https://via.placeholder.com/150/b0f7cc' },
  ];
  const totalStudents = 30; // Placeholder
  const currentStudents = students.length;

  // TODO: Implement Add Student logic (likely opens a modal or navigates)
  const handleAddStudent = () => {
    console.log("Add Student clicked");
  };

  // TODO: Implement Reset PIN logic
  const handleResetPin = (studentId: string) => {
    console.log(`Reset PIN for student ${studentId}`);
  };

  // TODO: Implement Edit logic (likely opens a modal or navigates)
  const handleEdit = (studentId: string) => {
    console.log(`Edit student ${studentId}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Student Accounts</CardTitle>
          <CardDescription>
            {currentStudents} of {totalStudents} accounts used
          </CardDescription>
        </div>
        <Button onClick={handleAddStudent}>Add Student</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {students.map((student) => (
            <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg bg-background hover:bg-muted/50">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={student.avatarUrl} alt={student.name} />
                  <AvatarFallback>{student.name?.charAt(0)?.toUpperCase() ?? 'S'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{student.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Age {student.age} • Level {student.level}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleResetPin(student.id)}>
                  Reset PIN
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleEdit(student.id)}>
                  Edit
                </Button>
              </div>
            </div>
          ))}
          {/* TODO: Add loading state skeleton */}
          {/* TODO: Add empty state if no students */}
          {/* TODO: Add pagination if many students */}
        </div>
      </CardContent>
    </Card>
  );
} 