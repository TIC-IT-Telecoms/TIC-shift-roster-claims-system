import api from './axiosInstance';

export const claimApi = {
  // Submit a brand new claim shift record
  submit: (data) => api.post('/claims', data),
  getMyClaims: (params = {}) => api.get('/claims/me', { params }),
  update: (id, data) => api.put(`/claims/${id}`, data),
  getAll: (params = {}) => api.get('/claims', { params }),
  getById: (id) => api.get(`/claims/${id}`),
  review: (id, data) => api.patch(`/claims/${id}/status`, data),
  reset: (id) => api.patch(`/claims/${id}/reset`),

  // Permanently delete a claim entry drop record
  delete: (id) => api.delete(`/claims/${id}`),
};