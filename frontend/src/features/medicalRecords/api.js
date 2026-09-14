// FILE: frontend/src/features/medicalRecords/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/medical-records';

export const medicalRecordsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default medicalRecordsApi;