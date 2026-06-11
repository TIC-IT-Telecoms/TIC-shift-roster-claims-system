import api from './axiosInstance';

export const claimApi = {
  submit: (data) => api.post('/claims', data),
  getMyClaims: (params = {}) => api.get('/claims/me', { params }),
  update: (id, data) => api.put(`/claims/${id}`, data),
  getAll: (params = {}) => api.get('/claims', { params }),
  getById: (id) => api.get(`/claims/${id}`),
  review: (id, data) => api.patch(`/claims/${id}/status`, data),
  reset: (id) => api.patch(`/claims/${id}/reset`),
  delete: (id) => api.delete(`/claims/${id}`),
};