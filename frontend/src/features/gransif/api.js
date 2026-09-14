// FILE: frontend/src/features/gransif/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/gransif';

export const gransifApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  activate: (id) => api.post(`${BASE_URL}/${id}/activate`),
};

export default gransifApi;