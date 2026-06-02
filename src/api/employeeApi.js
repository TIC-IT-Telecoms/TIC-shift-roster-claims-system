import api from './axiosInstance.js';

export const employeeApi = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  activate: (id) => api.patch(`/employees/${id}/activate`),
  deactivate: (id) => api.patch(`/employees/${id}/deactivate`),
  assignTeam: (id, team_id) => api.patch(`/employees/${id}/assign-team`, { team_id }),
};