// FILE: frontend/src/features/attendance/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/attendance';

export const attendanceApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  getMonthlyGrid: (assignmentId, year, month) => 
    api.get(`${BASE_URL}/monthly/${assignmentId}/${year}/${month}`),
  create: (data) => api.post(BASE_URL, data),
  saveDaily: (data) => api.post(`${BASE_URL}/daily`, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default attendanceApi;