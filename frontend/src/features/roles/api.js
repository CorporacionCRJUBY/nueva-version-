// FILE: frontend/src/features/roles/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/roles';

export const rolesApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  assignPermissions: (id, permissionIds) => api.post(`${BASE_URL}/${id}/permissions`, { permissionIds }),
  getPermissions: (id) => api.get(`${BASE_URL}/${id}/permissions`),
};

export default rolesApi;