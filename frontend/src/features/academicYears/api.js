// FILE: frontend/src/features/academicYears/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/academic-years';

export const academicYearsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default academicYearsApi;