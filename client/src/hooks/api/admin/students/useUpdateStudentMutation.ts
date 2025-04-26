import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import { UpdateStudentInput } from "@/lib/schemas/student";
import { ProfileDTO } from "@/types/api";
import { toast } from "sonner";

interface UpdateStudentParams {
  profileId: string;
  data: UpdateStudentInput;
}

// Define the function that calls the API
const updateStudent = async ({ profileId, data }: UpdateStudentParams): Promise<ProfileDTO> => {
  // API returns the updated ProfileDTO
  return await api.patch(`/profiles/admin/students/${profileId}`, data);
};

export const useUpdateStudentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ProfileDTO,         // Type of data returned by mutationFn (updated profile)
    ApiError,           // Type of error
    UpdateStudentParams // Type of variables passed to mutate fn
  >(
    {
      mutationFn: updateStudent,
      onSuccess: (updatedProfile, variables) => {
        console.log("Student updated successfully:", updatedProfile);

        // --- Query Invalidation Strategy ---
        // 1. Invalidate the list query to refetch all students
        queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });

        // 2. OPTIONALLY: Update the specific student query cache directly
        // This provides an immediate UI update without waiting for the list refetch.
        queryClient.setQueryData(['admin', 'student', variables.profileId], updatedProfile);

        // Show success notification
        toast.success("Student Updated", {
          description: `Profile for ${updatedProfile.fullName || 'student'} updated successfully.`,
        });
      },
      onError: (error, variables) => {
        console.error("Failed to update student:", error);
        toast.error("Update Failed", {
          description: error.message || "Could not update student profile.",
        });
      },
    }
  );
}; 