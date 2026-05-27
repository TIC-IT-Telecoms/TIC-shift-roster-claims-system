import api from './axiosInstance.js';

export const rosterApi = {
  generate: (data) => api.post('/rosters/generate', data),
  getAll: (params) => api.get('/rosters', { params }),
  getMyRoster: (params) => api.get('/rosters/me', { params }),
  getEmployeeRoster: (id, params) => api.get(`/rosters/employee/${id}`, { params }),
  updateEntry: (id, data) => api.patch(`/rosters/${id}`, data),
  deleteRange: (data) => api.delete('/rosters', { data }),
};