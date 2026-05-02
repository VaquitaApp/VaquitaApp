import api from './axios';

export const getFunds       = (params) => api.get('/funds', { params });
export const getPublicFunds = (params) => api.get('/funds/public', { params });
export const getFund        = (id)     => api.get(`/funds/${id}`);
export const createFund     = (data)   => api.post('/funds', data);
export const updateFund     = (id, data) => api.patch(`/funds/${id}`, data);
export const deleteFund     = (id)     => api.delete(`/funds/${id}`);
export const closeFund      = (id)     => api.post(`/funds/${id}/close`);
export const sendReminders  = (id, filter) => api.post(`/funds/${id}/reminders`, null, filter ? { params: { filter } } : undefined);
export const postMessage    = (id, data) => api.post(`/funds/${id}/messages`, data);
export const pauseFund      = (id)     => api.post(`/funds/${id}/pause`);
export const resumeFund     = (id)     => api.post(`/funds/${id}/resume`);
