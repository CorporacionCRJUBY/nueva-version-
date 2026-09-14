// FILE: frontend/src/features/academicHistory/api.js
import { api } from '../../api/axiosClient';

const BASE_URL = '/academic-history';

export const academicHistoryApi = {
  // Obtener todos los registros
  getAll: (params = {}) => api.get(BASE_URL, { params }),

  // Obtener por ID
  getById: (id) => api.get(`${BASE_URL}/${id}`),

  // Obtener por estudiante
  getByStudent: (studentId) => api.get(`${BASE_URL}/student/${studentId}`),

  // Crear registro
  create: (data) => api.post(BASE_URL, data),

  // Actualizar registro (antes no existía: el botón "Editar" llamaba a este
  // método aunque nunca estuvo definido aquí, así que fallaba de inmediato
  // en el navegador sin siquiera llegar al backend)
  update: (id, data) => api.put(`${BASE_URL}/${id}`, data),

  // Eliminar registro (mismo problema: el botón "Eliminar" llamaba a un
  // método inexistente)
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
};

export default academicHistoryApi;