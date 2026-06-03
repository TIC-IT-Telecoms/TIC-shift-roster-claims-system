import api from './axiosInstance.js';

export const payrollApi = {
  // GET /api/payroll -> Fetches records (Enforces role-isolation on the backend)
  getHistory: () => api.get('/payroll'),

  // POST /api/payroll/generate -> Admin payload execution to run formulas
  generate: (payload) => api.post('/payroll/generate', payload),
};