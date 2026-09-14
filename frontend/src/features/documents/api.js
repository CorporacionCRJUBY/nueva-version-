// FILE: frontend/src/features/documents/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/documents';

export const documentsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  upload: (formData, onProgress) => {
    return api.upload(BASE_URL + '/upload', formData, onProgress);
  },
  download: (id, filename) => api.download(`${BASE_URL}/${id}/download`, filename),
};

export default documentsApi;