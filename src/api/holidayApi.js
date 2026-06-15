import api from './axiosInstance';

export const holidayApi = {
  getAll: (year) => api.get('/holidays', {
      params: year ? { year } : undefined,
  }),
  getById: (id) => api.get(`/holidays/${id}`),

  checkByDate: (date) => api.get(`/holidays/check/${date}`),

  create: (data) => api.post('/holidays', data),

  bulkCreate: (holidays) => api.post(`/holidays/bulk`, { holidays }),

  update: (id, data) => api.put(`/holidays/${id}`, data),

  remove: (id) => api.delete(`/holidays/${id}`),
};