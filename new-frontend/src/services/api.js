import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (email, password, role = 'analyst') =>
    api.post('/auth/register', { email, password, role }),
  
  login: async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response;
  },
  
  me: () => api.get('/auth/me')
};

// Flights API
export const flightsAPI = {
  list: (limit = 100) => api.get('/flights/', { params: { limit } }),
  get: (flightId) => api.get(`/flights/${flightId}`),
  ingestTelemetry: (telemetry) => api.post('/flights/telemetry', telemetry)
};

// Alerts API
export const alertsAPI = {
  list: (acknowledged = null) => 
    api.get('/alerts/', { params: { acknowledged } }),
  get: (alertId) => api.get(`/alerts/${alertId}`),
  acknowledge: (alertId) => api.post('/alerts/acknowledge', { alert_id: alertId })
};

// Restricted Areas API
export const restrictedAreasAPI = {
  list: () => api.get('/restricted-areas/'),
  getActive: () => api.get('/restricted-areas/active'),
  create: (name, polygon_json) => 
    api.post('/restricted-areas/', { name, polygon_json }),
  toggle: (areaId) => api.patch(`/restricted-areas/${areaId}/toggle`),
  update: (areaId, data) => api.patch(`/restricted-areas/${areaId}`, data),
  delete: (areaId) => api.delete(`/restricted-areas/${areaId}`)
};

// Simulator API
export const simulatorAPI = {
  start: (data) => api.post('/simulator/start', data),
  sendAllTelemetry: () => api.post('/simulator/send-all-combined'),
  clear: () => api.delete('/simulator/clear'),
  clearManual: () => api.delete('/simulator/manual/clear'),
  status: () => api.get('/simulator/status'),
  registerManual: (telemetry) => api.post('/simulator/manual/register', telemetry),
  previewTrajectory: (data) => api.post('/simulator/preview-trajectory', data)
};

// WebSocket connection
export class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = [];
  }

  connect() {
    this.ws = new WebSocket('ws://localhost:8000/ws');
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.listeners.forEach(listener => listener(data));
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
    };
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default api;
