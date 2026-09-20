// FILE: frontend/src/features/students/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/students';

export const studentsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  getFullRecord: (id) => api.get(`${BASE_URL}/${id}/record`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  updateStatus: (id, data) => api.post(`${BASE_URL}/${id}/status`, data),
  uploadPhoto: (id, file, onProgress) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.upload(`${BASE_URL}/${id}/photo`, formData, onProgress);
  },
};

export default studentsApi;