// FILE: frontend/src/features/assignments/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/assignments';

export const assignmentsApi = {
  getAll: (params = {}) => api.get(BASE_URL, { params }),
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  getByTeacher: (teacherId, params = {}) => api.get(`${BASE_URL}/teacher/${teacherId}`, { params }),
  // FIX (2026-09-16, autoasignación de materias): "planilla" de grupos
  // (grado+sección) con sus materias y quién las tiene asignadas, para que
  // el propio docente busque su grupo y se autoasigne.
  getGroups: (params = {}) => api.get(`${BASE_URL}/groups`, { params }),
  getBySection: (sectionId, params = {}) => api.get(`${BASE_URL}/section/${sectionId}`, { params }),
  create: (data) => api.post(BASE_URL, data),
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default assignmentsApi;