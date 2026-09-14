// FILE: frontend/src/features/settings/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/settings';

export const settingsApi = {
  get: () => api.get(BASE_URL),
  update: (data) => api.put(BASE_URL, data),
};

export default settingsApi;