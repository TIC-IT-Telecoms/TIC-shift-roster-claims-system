import api from './axiosInstance.js';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (resetPayload) => api.post('/auth/reset-password', resetPayload),
};