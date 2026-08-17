interface UpdateAdminUserRoleResponse {
  data: {
    user: {
      id: string;
      role: 'user' | 'admin';
    };
  };
}

export async function updateAdminUserRole(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  userId: string,
  role: 'user' | 'admin',
) {
  const response = await request<UpdateAdminUserRoleResponse>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });

  return response.data.user;
}
