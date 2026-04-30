import api from './axios';

export const inviteUser       = (fundId, userId) => api.post(`/funds/${fundId}/invitations`, { userId });
export const cancelInvitation = (fundId, userId) => api.delete(`/funds/${fundId}/invitations/${userId}`);
export const getParticipants  = (fundId)          => api.get(`/funds/${fundId}/participants`);
export const removeParticipant = (fundId, userId) => api.delete(`/funds/${fundId}/participants/${userId}`);
export const searchUsers      = (q)               => api.get('/users/search', { params: { q } });
export const updateProfile    = (data)            => api.patch('/users/profile', data);
export const requestDeleteAccount = ()            => api.post('/users/request-delete');
export const confirmDeleteAccount = (token)       => api.get(`/users/confirm-delete/${token}`);
export const acceptInvitation   = (token)  => api.post(`/invitations/${token}/accept`);
export const rejectInvitation   = (token)  => api.post(`/invitations/${token}/reject`);
export const requestJoin        = (fundId) => api.post(`/funds/${fundId}/join-request`);
export const acceptJoinRequest  = (token)  => api.post(`/join-requests/${token}/accept`);
export const rejectJoinRequest  = (token)  => api.post(`/join-requests/${token}/reject`);
export const acceptMyInvitation = (fundId) => api.post(`/funds/${fundId}/accept-my-invitation`);
