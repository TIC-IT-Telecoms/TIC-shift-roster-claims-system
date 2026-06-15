import api from './axiosInstance';

export const payrollApi = {
  generate:      (data)   => api.post('/payroll/generate', data),
  generateBulk:  (data)   => api.post('/payroll/generate-bulk', data),
  getPreview:    (params) => api.get('/payroll/preview', { params }),
  getAll:        (params) => api.get('/payroll', { params }),
  getMyPayroll:  ()       => api.get('/payroll'),
  getById:       (id)     => api.get(`/payroll/${id}`),
  delete:        (id)     => api.delete(`/payroll/${id}`),
};