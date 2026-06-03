import api from './axiosInstance.js';

export const claimApi = {
  submit: (data) => api.post('/claims', data),
  getMyClaims: () => api.get('/claims/'),
  getAll: (params) => api.get('/claims', { params }),
  getById: (id) => api.get(`/claims/${id}`),
  update: (id, data) => api.put(`/claims/${id}`, data),
  reset: (id) => api.patch(`/claims/${id}/reset`),
  delete: (id) => api.delete(`/claims/${id}`),
};