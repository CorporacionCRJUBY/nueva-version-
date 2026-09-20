// FILE: frontend/src/features/guardians/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/guardians';

export const guardiansApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  getByStudent: (studentId) => api.get(`${BASE_URL}/student/${studentId}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default guardiansApi;