import api from './axiosInstance.js';

export const rotationApi = {
  getAll: () => api.get('/rotations'),
  getById: (id) => api.get(`/rotations/${id}`),
  getActive: () => api.get('/rotations/active'),
  getCurrentDay: (id) => api.get(`/rotations/${id}/current-day`),
  create: (data) => api.post('/rotations', data),
  update: (id, data) => api.put(`/rotations/${id}`, data),
  updateDetails: (id, details) => api.put(`/rotations/${id}/details`, { details }),
  delete: (id) => api.delete(`/rotations/${id}`),
};