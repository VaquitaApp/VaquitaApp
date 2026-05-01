import api from './axios';

export const createContribution = (fundId, data)  => api.post(`/funds/${fundId}/contributions`, data);
export const getContributions   = (fundId)         => api.get(`/funds/${fundId}/contributions`);
export const triggerPayment     = (fundId)         => api.post(`/funds/${fundId}/payment`);
