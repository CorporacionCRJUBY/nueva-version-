// FILE: frontend/src/features/gradeChangeRequests/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/grade-change-requests';

export const gradeChangeRequestsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  approve: (id, data) => api.post(`${BASE_URL}/${id}/approve`, data),
  reject: (id, data) => api.post(`${BASE_URL}/${id}/reject`, data),
};

export default gradeChangeRequestsApi;