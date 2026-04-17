import axios from 'axios';

// Connect to localhost:5000 in local dev, or dynamic URL if provided.
// In docker-compose, we can just use localhost from the browser's perspective.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const submitRequest = async (prompt: string) => {
  const response = await axios.post(`${API_URL}/request`, { prompt });
  return response.data; // { id, status }
};

export const fetchStatus = async (id: number) => {
  const response = await axios.get(`${API_URL}/status/${id}`);
  return response.data; // { id, status, message, logs }
};
