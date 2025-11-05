import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (username: string, password: string) =>
    api.post('/auth/register', { username, password }),
};

export const prospectsApi = {
  getAll: () => api.get('/prospects'),
  getOne: (id: string) => api.get(`/prospects/${id}`),
  create: (data: {
    name: string;
    email: string;
    phone: string;
    company: string;
    role?: string;
    industry?: string;
    company_size?: string;
    custom_instructions?: string;
  }) => api.post('/prospects', data),
  updateInstructions: (id: string, custom_instructions: string) =>
    api.patch(`/prospects/${id}/instructions`, { custom_instructions }),
  runResearch: (id: string) => api.post(`/prospects/${id}/research`),
  getStats: () => api.get('/prospects/stats/summary'),
};

export const callsApi = {
  getAll: () => api.get('/calls'),
  getOne: (id: string) => api.get(`/calls/${id}`),
  start: (prospectId: string, callType: 'voice' | 'whatsapp' = 'voice') =>
    api.post('/calls/start', { prospect_id: prospectId, call_type: callType }),
  sendMessage: (callId: string, message: string) =>
    api.post(`/calls/${callId}/message`, { message }),
  end: (callId: string, outcome: string, meetingBooked: boolean) =>
    api.post(`/calls/${callId}/end`, { outcome, meeting_booked: meetingBooked }),
  getStats: () => api.get('/calls/stats/summary'),
};

export const campaignsApi = {
  getAll: () => api.get('/campaigns'),
  getStats: () => api.get('/campaigns/stats/summary'),
};

export const meetingsApi = {
  getAll: () => api.get('/meetings'),
  getOne: (id: string) => api.get(`/meetings/${id}`),
  create: (data: {
    prospect_id: string;
    call_id?: string;
    scheduled_time: string;
    duration_minutes?: number;
    meeting_type?: string;
    account_manager_name?: string;
    account_manager_email?: string;
    notes?: string;
  }) => api.post('/meetings', data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/meetings/${id}/status`, { status }),
  getStats: () => api.get('/meetings/stats/summary'),
};

export default api;
