import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/apiClient';
import type { ProfileDTO } from '@/types/api';
import type { ProfileUpdateInput } from '@/lib/schemas/profile'; // Import the input type
import { useAuthStore } from '@/store/authStore'; // To potentially update user state on success
import { toast } from 'sonner'; // Import toast for feedback

// Define the mutation function
const updateProfile = async (profileData: ProfileUpdateInput): Promise<ProfileDTO> => {
    try {
        // Use PATCH request to /profiles/me
        const updatedProfile = await api.patch<ProfileDTO>('/profiles/me', profileData);
        return updatedProfile;
    } catch (error) {
        // Handle potential ApiError from the client wrapper
        if (error instanceof ApiError) {
            console.error(`API Error updating profile (${error.status}): ${error.message}`, error.data);
            // Re-throw a more specific error message for the UI
            throw new Error(error.message || 'Failed to update profile.');
        } else {
            console.error("Unexpected error updating profile:", error);
            throw new Error('An unexpected error occurred while updating the profile.');
        }
    }
};

// Define the custom hook
export const useUpdateProfileMutation = () => {
    const queryClient = useQueryClient();
    const setProfile = useAuthStore((state) => state.setProfile);

    return useMutation<ProfileDTO, Error, ProfileUpdateInput>({ // Specify Data, Error, and Variables types
        mutationFn: updateProfile,
        onSuccess: (data) => {
            console.log('Profile update successful:', data);
            // Invalidate the profile query to refetch fresh data
            queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });

            // Optionally, update the user state in Zustand immediately for a smoother UI update
            // This avoids waiting for the query invalidation to complete
            setProfile(data);

            // Show success notification
            toast.success("Profile updated successfully!");
        },
        onError: (error) => {
            console.error('Profile update failed:', error);
            // Show error notification
            toast.error(error.message || "Failed to update profile. Please try again.");
        },
        // You can add onMutate for optimistic updates later if needed
    });
}; 