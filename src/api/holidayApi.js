import api from './axiosInstance.js';

export const holidayApi = {
  getAll: (year) => api.get('/holidays', { params: { year } }),
  getById: (id) => api.get(`/holidays/${id}`),
  checkDate: (date) => api.get(`/holidays/check/${date}`),
  create: (data) => api.post('/holidays', data),
  bulkCreate: (holidays) => api.post('/holidays/bulk', { holidays }),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
};