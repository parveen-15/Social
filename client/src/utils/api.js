import axios from 'axios';
import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export const api = axios.create({ baseURL: API_BASE, timeout: 8000 });

// Attach the Firebase ID token to every request automatically
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const syncAuthUser   = (provider) => api.post('/auth/sync', { provider });
export const completeProfile = (data)    => api.patch('/auth/profile', data);
export const getMe           = ()        => api.get('/auth/me');

// Users
export const getUsers = (params) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const getUserByIdentifier = (identifier) => api.get(`/users/by/${identifier}`);
export const createUser = (data) => api.post('/users/create', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const uploadAvatar = (id, file) => {
  const form = new FormData();
  form.append('avatar', file);
  return api.post(`/users/${id}/avatar`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const uploadPhotos = (id, files) => {
  const form = new FormData();
  files.forEach(f => form.append('photos', f));
  return api.post(`/users/${id}/photos`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const deletePhoto = (id, idx) => api.delete(`/users/${id}/photos/${idx}`);
export const sendFriendRequest = (id, targetId) => api.post(`/users/${id}/friend-request/${targetId}`);
export const acceptFriendRequest = (id, requesterId) => api.post(`/users/${id}/accept-request/${requesterId}`);
export const declineFriendRequest = (id, requesterId) => api.post(`/users/${id}/decline-request/${requesterId}`);
export const removeFriend = (id, friendId) => api.delete(`/users/${id}/friends/${friendId}`);

// Posts
export const getPosts = (params) => api.get('/posts', { params });
export const getUserPosts = (userId) => api.get(`/posts/user/${userId}`);
export const createPost = (data) => {
  const form = new FormData();
  form.append('userId', data.userId);
  form.append('caption', data.caption || '');
  if (data.images) data.images.forEach(f => form.append('images', f));
  return api.post('/posts', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const likePost = (id, userId) => api.post(`/posts/${id}/like`, { userId });
export const commentPost = (id, userId, text) => api.post(`/posts/${id}/comment`, { userId, text });
export const editPost = (id, userId, caption) => api.patch(`/posts/${id}`, { userId, caption });
export const deletePost = (id, userId) => api.delete(`/posts/${id}`, { data: { userId } });
export const deleteComment = (postId, commentId, userId) => api.delete(`/posts/${postId}/comment/${commentId}`, { data: { userId } });
export const replyComment = (postId, commentId, userId, text) => api.post(`/posts/${postId}/comment/${commentId}/reply`, { userId, text });
export const deleteReply = (postId, commentId, replyId, userId) => api.delete(`/posts/${postId}/comment/${commentId}/reply/${replyId}`, { data: { userId } });

// Messages
export const getConversations = (userId) => api.get(`/messages/conversations/${userId}`);
export const getConversation = (userId, otherId) => api.get(`/messages/conversation/${userId}/${otherId}`);
export const getMessages = (conversationId, userId) => api.get(`/messages/${conversationId}`, { params: { userId } });
export const sendMessage = (data) => api.post('/messages', data);
export const markRead = (conversationId, userId) => api.put(`/messages/${conversationId}/read`, { userId });
export const deleteConversation = (convId) => api.delete(`/messages/conversation/${convId}`);
export const recallMessage = (msgId, senderId) => api.patch(`/messages/${msgId}/recall`, { senderId });
export const deleteMessageForMe = (msgId, userId) => api.patch(`/messages/${msgId}/delete-for-me`, { userId });
export const sendMediaMessage = (data, onProgress) => {
  const form = new FormData();
  form.append('conversationId', data.conversationId);
  form.append('senderId', data.senderId);
  if (data.text) form.append('text', data.text);
  form.append('media', data.file);
  // Do NOT set Content-Type manually — axios sets multipart/form-data + boundary automatically
  return api.post('/messages/media', form, {
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  });
};
