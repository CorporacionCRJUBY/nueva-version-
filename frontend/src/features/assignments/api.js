// FILE: frontend/src/features/assignments/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/assignments';

export const assignmentsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  getByTeacher: (teacherId, params = {}) => api.get(`${BASE_URL}/teacher/${teacherId}`, { params }),
  getBySection: (sectionId, params = {}) => api.get(`${BASE_URL}/section/${sectionId}`, { params }),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default assignmentsApi;