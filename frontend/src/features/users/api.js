// FILE: frontend/src/features/users/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/users';

export const usersApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  changePassword: (id, data) => api.post(`${BASE_URL}/${id}/change-password`, data),
  assignRoles: (id, roleIds) => api.post(`${BASE_URL}/${id}/roles`, { roleIds }),
  getRoles: (id) => api.get(`${BASE_URL}/${id}/roles`),
};

export default usersApi;