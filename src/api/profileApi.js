import api from './axiosInstance.js';

export const profileApi = {
  getProfile: () => api.get('/profile/me'),
  updatePhone: (phone) => api.patch('/profile/me/phone', { phone }),
  updateAddress: (address) => api.patch('/profile/me/address', { address }),
  changePassword: (data) => api.put('/profile/me/password', data),
  // updatePicture: (formData) =>
  //   api.patch('/profile/me/picture', formData, {
  //     headers: { 'Content-Type': 'multipart/form-data' },
  //   }),
};