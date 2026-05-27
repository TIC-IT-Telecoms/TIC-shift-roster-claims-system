import api from './axiosInstance.js';

export const teamApi = {
  getAll: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  assignEmployees: (id, employee_ids) => api.patch(`/teams/${id}/assign`, { employee_ids }),
  delete: (id) => api.delete(`/teams/${id}`),
};