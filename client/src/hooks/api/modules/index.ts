import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/apiClient";
import { ReadingModule } from "@/shared/types";

export function useModuleQuery(moduleId: string) {
  return useQuery<ReadingModule, ApiError>({
    queryKey: ["module", moduleId],
    queryFn: async () => {
      const response = await api.get<ReadingModule>(`/api/v1/modules/${moduleId}`);
      return response;
    },
  });
} 