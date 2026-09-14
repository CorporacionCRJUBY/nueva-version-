// FILE: frontend/src/features/activity/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/activity';

export const activityApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  getByUser: (userId, params = {}) => api.get(`${BASE_URL}/user/${userId}`, { params }),
};

export default activityApi;