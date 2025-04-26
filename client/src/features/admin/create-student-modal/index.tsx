'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateStudentMutation } from '@/hooks/api/admin/students/useCreateStudentMutation';
import { createStudentSchema, CreateStudentInput } from '@/lib/schemas/users';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define reading levels explicitly since import fails
const readingLevelOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    // Object.values(ReadingLevel)
    // .filter(value => typeof value === 'number') as number[];

export function CreateStudentModal({ isOpen, onClose }: CreateStudentModalProps) {
  const createStudentMutation = useCreateStudentMutation();

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      fullName: '',
      pin: '',
      age: undefined,
      readingLevel: null,
    },
  });

  const onSubmit = (data: CreateStudentInput) => {
    console.log("Submitting student data:", data);
    createStudentMutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        onClose();
      },
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student's details below. They will use the PIN to log in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>4-Digit PIN</FormLabel>
                  <FormControl>
                    <Input type="password" maxLength={4} placeholder="e.g., 1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input 
                        type="number" 
                        placeholder="e.g., 7" 
                        {...field} 
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="readingLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reading Level (Optional)</FormLabel>
                  <Select 
                    value={field.value === null ? 'none' : field.value ? String(field.value) : ''} 
                    onValueChange={(v) => { 
                        if (v === 'none') {
                            field.onChange(null);
                        } else {
                            field.onChange(v ? Number(v) : null);
                        }
                     }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reading level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {readingLevelOptions.map(level => (
                        <SelectItem key={level} value={String(level)}>
                          Level {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createStudentMutation.isPending}>
                {createStudentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Student
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 