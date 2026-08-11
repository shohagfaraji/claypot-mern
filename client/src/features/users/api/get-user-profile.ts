import type { PublicUserProfile } from '@/features/users/types';
import { apiRequest } from '@/lib/api-client';

interface GetUserProfileResponse {
  data: {
    user: PublicUserProfile;
  };
}

export async function getUserProfile(username: string, signal?: AbortSignal) {
  const response = await apiRequest<GetUserProfileResponse>(
    `/users/${encodeURIComponent(username)}`,
    { signal },
  );

  return response.data.user;
}
