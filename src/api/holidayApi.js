import api from './axiosInstance';

export const holidayApi = {
  getAll: (params) => api.get('/holidays', { params }),
  create: (data) => api.post('/holidays', data),
  bulkCreate: (holidays) =>
    api.post('/holidays/bulk', { holidays }),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
};