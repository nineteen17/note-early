import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import { CreateStudentInput } from "@/lib/schemas/users"; // Use the updated schema
// import { ProfileDTO } from "@shared/types"; // Still having path issues
import { toast } from "sonner";

// Define the expected success response type (replace any when import works)
type CreateStudentSuccessResponse = any; // TODO: Replace with ProfileDTO

// Function to call the API endpoint for creating a student
const createStudent = async (data: CreateStudentInput): Promise<CreateStudentSuccessResponse> => {
  // Endpoint from Swagger: POST /auth/admin/student
  // api.post expects the type of the *unwrapped* successful data
  const response = await api.post<CreateStudentSuccessResponse>('/auth/admin/student', data);
  return response; 
};

export const useCreateStudentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateStudentSuccessResponse, ApiError, CreateStudentInput>(
    {
      mutationFn: createStudent,
      onSuccess: (data) => {
        // Assuming the response data has fullName even if type is 'any'
        const studentName = data?.fullName || 'New Student'; 
        toast.success(`Student "${studentName}" created successfully!`);
        
        // Invalidate queries to refresh the student list
        queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
        queryClient.invalidateQueries({ queryKey: ['profiles', 'admin'] }); 
      },
      onError: (error) => {
        console.error("Student creation failed:", error);
        console.error("Error status:", error.status);
        console.error("Error message:", error.message);
        console.error("Error data:", error.data);
        
        // Enhanced error message extraction
        let errorMessage = 'Failed to create student. Please try again.';
        
        if (error.status === 403) {
          // Subscription limit error
          errorMessage = error.message || 'You have reached your student limit for your current plan. Please upgrade to create more students.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        console.log("Showing toast with message:", errorMessage);
        toast.error(errorMessage);
      },
    }
  );
}; 