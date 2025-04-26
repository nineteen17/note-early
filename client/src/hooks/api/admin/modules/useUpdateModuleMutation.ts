'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/apiClient';
import { type ReadingModule, type UpdateModuleInput } from '@/lib/schemas/modules';

interface UpdateModulePayload {
  moduleId: string;
  data: UpdateModuleInput;
}

// Define the API call function
const updateModule = async ({
  moduleId,
  data,
}: UpdateModulePayload): Promise<ReadingModule> => {
  const response = await api.patch<ReadingModule>(
    `/reading-modules/${moduleId}`,
    data,
  );
  return response; // api.patch likely returns the data directly
};

// Create the custom mutation hook
export const useUpdateModuleMutation = (moduleId: string) => {
  const queryClient = useQueryClient();

  return useMutation<ReadingModule, Error, UpdateModuleInput>({
    mutationFn: (data) => updateModule({ moduleId, data }),
    onSuccess: (updatedModule) => {
      // Invalidate queries related to the specific module
      queryClient.invalidateQueries({ queryKey: ['modules', moduleId] });
      // Invalidate queries related to the list of admin modules (if applicable)
      queryClient.invalidateQueries({ queryKey: ['admin', 'my-modules'] });
      // Optionally, update the cache directly for a faster UI update
      // queryClient.setQueryData(['modules', moduleId], updatedModule);

      toast.success('Module updated successfully!');
    },
    onError: (error) => {
      // Handle and display errors
      toast.error(`Failed to update module: ${error.message}`);
      console.error('Update module error:', error);
    },
  });
}; 