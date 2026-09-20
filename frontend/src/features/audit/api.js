// FILE: frontend/src/features/audit/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/audit';

export const auditApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  getByRecord: (recordCode) => api.get(`${BASE_URL}/record/${recordCode}`),
};

export default auditApi;