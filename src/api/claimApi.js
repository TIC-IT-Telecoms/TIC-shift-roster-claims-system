import api from './axiosInstance.js';

export const claimApi = {
  // Submit a brand new claim shift record
  submit: (data) => api.post('/claims', data),

  // Retrieve claims for the currently logged-in employee
  getMyClaims: () => api.get('/claims/'),

  // Fetch all claims across the organization (Permits optional filtering query parameters)
  getAll: (params) => api.get('/claims', { params }),

  // Get a single claim detail row by ID
  getById: (id) => api.get(`/claims/${id}`),

  // FOR EMPLOYEES: Update claim values (Permitted only if status is still 'Pending')
  // Route: PUT /api/claims/:id
  update: (id, data) => api.put(`/claims/${id}`, data),

  // FOR ADMINS: Review/Approve/Reject a claim status & log audit footprints
  // Route: PATCH /api/claims/:id/status
  // Payload expects: { status: 'Approved' | 'Rejected', notes: '...' }
  reviewClaim: (id, { status, notes }) => api.patch(`/claims/${id}/status`, { status, notes }),

  // Reset a finalized claim record back to standard state rules
  reset: (id) => api.patch(`/claims/${id}/reset`),

  // Permanently delete a claim entry drop record
  delete: (id) => api.delete(`/claims/${id}`),
};