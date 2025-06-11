import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import { CreateModuleInput } from "@/lib/schemas/modules";
import { ReadingModuleDTO } from "@/types/api";
import { toast } from "sonner";

// Define the function that calls the API
const createModule = async (data: CreateModuleInput): Promise<ReadingModuleDTO> => {
  // API returns the created ReadingModuleDTO
  return await api.post<ReadingModuleDTO>("/reading-modules", data);
};

export const useCreateModuleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ReadingModuleDTO,  // Type of data returned by mutationFn
    ApiError,          // Type of error
    CreateModuleInput  // Type of variables passed to mutate fn
  >(
    {
      mutationFn: createModule,
      onSuccess: (newModule) => {
        console.log("Module created successfully:", newModule);

        // Invalidate the list of the admin's modules to refetch
        queryClient.invalidateQueries({ queryKey: ['admin', 'modules', 'my'] });
        
        // Optional: Could also invalidate a general 'active modules' query if one exists
        // queryClient.invalidateQueries({ queryKey: ['modules', 'active'] });

        // Removed duplicate toast - let the component handle success notifications
        
        // Consider redirecting the user after successful creation, 
        // e.g., to the module list or the new module's edit page.
        // This is often handled in the component calling the mutation.
      },
      onError: (error) => {
        console.error("Failed to create module:", error);
        toast.error("Module Creation Failed", {
          description: error.message || "Could not create the module.",
        });
      },
    }
  );
}; 