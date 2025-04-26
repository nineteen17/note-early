import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import { ResetStudentPinInput } from "@/lib/schemas/student"; // Technically only need newPin from here for body
import { toast } from "sonner";

interface ResetPinParams {
  studentId: string;
  newPin: string;
}

// Define the function that calls the API
const resetStudentPin = async ({ studentId, newPin }: ResetPinParams): Promise<{ message: string }> => {
  // API returns 200 with { message: string }
  return await api.post(`/auth/admin/student/reset-pin`, { studentId, newPin });
};

export const useResetStudentPinMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string }, // Type of data returned by mutationFn
    ApiError,           // Type of error
    ResetPinParams      // Type of variables passed to mutate fn
  >(
    {
      mutationFn: resetStudentPin,
      onSuccess: (data, variables) => {
        console.log("Student PIN reset successfully:", data.message);
        toast.success("PIN Reset Successful", {
          description: data.message || `PIN for student ${variables.studentId} has been reset.`,
        });
        // No specific query invalidation needed unless we display PIN status somewhere
      },
      onError: (error, variables) => {
        console.error("Failed to reset student PIN:", error);
        toast.error("PIN Reset Failed", {
          description: error.message || "Could not reset the student PIN.",
        });
      },
    }
  );
}; 