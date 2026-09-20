// FILE: frontend/src/features/academicPeriods/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/academic-periods';

export const academicPeriodsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  close: (id) => api.post(`${BASE_URL}/${id}/close`),
  lock: (id) => api.post(`${BASE_URL}/${id}/lock`),
};

export default academicPeriodsApi;