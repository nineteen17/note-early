import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import { toast } from "sonner";

// Define the function that calls the API
const deleteStudent = async (profileId: string): Promise<{ message: string }> => {
  // API returns 200 with { message: string } according to spec (verify actual response)
  return await api.delete(`/profiles/admin/students/${profileId}`);
};

export const useDeleteStudentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string }, // Type of data returned by mutationFn
    ApiError,           // Type of error
    string              // Type of variables passed to mutate fn (profileId)
  >(
    {
      mutationFn: deleteStudent,
      onSuccess: (data, profileId) => {
        console.log("Student deleted successfully:", data.message);

        // --- Query Invalidation Strategy ---
        // 1. Invalidate the list query to refetch
        queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });

        // 2. Remove the specific student query from the cache if it exists
        queryClient.removeQueries({ queryKey: ['admin', 'student', profileId] });

        toast.success("Student Deleted", {
          description: data.message || "The student profile was deleted.",
        });
      },
      onError: (error, profileId) => {
        console.error("Failed to delete student:", error);
        toast.error("Delete Failed", {
          description: error.message || "Could not delete student profile.",
        });
      },
    }
  );
}; 