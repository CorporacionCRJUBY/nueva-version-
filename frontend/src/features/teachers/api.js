// FILE: frontend/src/features/teachers/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/teachers';

export const teachersApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  getAssignments: (id, params = {}) => api.get(`${BASE_URL}/${id}/assignments`, { params }),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default teachersApi;