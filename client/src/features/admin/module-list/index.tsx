'use client';

import React from 'react';
import Link from 'next/link';
import { useMyModulesQuery } from '@/hooks/api/admin/modules/useMyModulesQuery';
import { ReadingModuleDTO } from '@/types/api';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge"; // To display level/genre
import { MoreHorizontal, Trash2, Edit, PlusCircle } from 'lucide-react'; // Icons
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// TODO: Implement Delete Module confirmation/mutation
// import { useDeleteModuleMutation } from '@/hooks/api/admin/modules/useDeleteModuleMutation';

export function AdminModuleList() {
  const { data: modules, isLoading, error, isError } = useMyModulesQuery();
  // const deleteMutation = useDeleteModuleMutation(); // TODO

  const handleEditModule = (moduleId: string) => {
    // TODO: Implement navigation or modal opening for editing
    console.log(`Edit Module clicked: ${moduleId}`);
    // router.push(`/admin/modules/${moduleId}/edit`);
  };

  const handleDeleteModule = (moduleId: string) => {
    // TODO: Implement confirmation dialog
    console.log(`Delete Module clicked: ${moduleId}`);
    // deleteMutation.mutate(moduleId);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-semibold">My Reading Modules</h1>
           <p className="text-muted-foreground">
             Manage your custom reading modules.
           </p>
        </div>
        <Button asChild>
            <Link href="/admin/modules/create">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Module
            </Link>
        </Button>
      </div>

      {/* Error Handling */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error Loading Modules</AlertTitle>
          <AlertDescription>
            {error?.message || "Failed to load your modules."}
          </AlertDescription>
        </Alert>
      )}

      {/* Module Table Card */}
      <Card>
         <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Genre</TableHead>
                <TableHead className="hidden md:table-cell">Level</TableHead>
                <TableHead className="hidden md:table-cell">Language</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                 <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Skeleton Loading */}
              {isLoading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[40px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[40px]" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-[60px] rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))}

              {/* No Data Row */}
              {!isLoading && !isError && modules?.length === 0 && (
                 <TableRow>
                   <TableCell colSpan={7} className="h-24 text-center">
                     You haven't created any modules yet.
                   </TableCell>
                 </TableRow>
               )}

              {/* Data Rows */}
              {!isLoading &&
                !isError &&
                modules?.map((module) => (
                  <TableRow key={module.id}>
                    <TableCell className="font-medium">{module.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{module.genre}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{module.level}</TableCell>
                    <TableCell className="hidden md:table-cell">{module.language}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(module.createdAt)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                        <Badge variant={module.isActive ? 'default' : 'secondary'}>
                            {module.isActive ? 'Active' : 'Draft'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditModule(module.id)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Module
                          </DropdownMenuItem>
                           {/* TODO: Add View Progress/Details Link */}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => handleDeleteModule(module.id)}
                            >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Module
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
         </CardContent>
      </Card>
       {/* TODO: Add Delete Confirmation Dialog */}
    </div>
  );
} 