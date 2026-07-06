import api from './axiosInstance';

export const complianceApi = {
  /** Run check for one employee */
  check: (data) => api.post('/compliance/check', data),

  /** Run bulk check for all employees */
  checkAll: (data) => api.post('/compliance/check-all', data),

  /** Get all flags (admin) or own flags (employee) */
  getAll: (params) => api.get('/compliance', { params }),

  /** Get own flags (employee) */
  getMine: () => api.get('/compliance/me'),

  /** Resolve a flag */
  resolve: (id, notes) => api.patch(`/compliance/${id}/resolve`, { notes }),

  /** Delete a flag (admin) */
  delete: (id) => api.delete(`/compliance/${id}`),
};