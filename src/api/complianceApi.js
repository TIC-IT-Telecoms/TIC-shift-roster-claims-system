import api from './axiosInstance.js';

export const complianceApi = {
  // GET /api/compliance -> Fetches flags (filtered optionally by resolution status)
  getFlags: (params) => api.get('/compliance', { params }),

  // POST /api/compliance/check -> Triggers the automated BCEA compliance engine check
  checkCompliance: (payload) => api.post('/compliance/check', payload),

  // PATCH /api/compliance/:id/resolve -> Resolves an active flag
  resolveFlag: (id) => api.patch(`/compliance/${id}/resolve`),
};