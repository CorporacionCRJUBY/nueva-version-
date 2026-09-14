// FILE: frontend/src/features/previousSchools/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/previous-schools';

export const previousSchoolsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  getByStudent: (studentId) => api.get(`${BASE_URL}/student/${studentId}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default previousSchoolsApi;