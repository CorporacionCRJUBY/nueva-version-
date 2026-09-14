// FILE: frontend/src/features/calendar/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/calendar';

export const calendarApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getByMonth: (year, month, params = {}) => api.get(`${BASE_URL}/${year}/${month}`, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default calendarApi;