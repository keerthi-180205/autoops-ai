import axios from 'axios';

// Dynamically resolve API URL: use env var if provided, otherwise derive from
// the current browser hostname so it works on both localhost and EC2/remote.
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

export const submitRequest = async (prompt: string) => {
  const response = await axios.post(`${API_URL}/request`, { prompt });
  return response.data; // { id, status }
};

export const fetchStatus = async (id: number) => {
  const response = await axios.get(`${API_URL}/status/${id}`);
  return response.data; // { id, status, prompt, message, logs }
};

export const replyToRequest = async (id: number, answer: string) => {
  const response = await axios.post(`${API_URL}/request/${id}/reply`, { answer });
  return response.data; // { id, status, message }
};

export const fetchHistory = async () => {
  const response = await axios.get(`${API_URL}/history`);
  return response.data; // array of past requests
};

export const destroyResource = async (type: string, id: string, requestId: number) => {
  const response = await axios.post(`${API_URL}/destroy`, {
    resource_type: type,
    resource_id: id,
    requestId: requestId
  });
  return response.data;
};

export const fetchCostSummary = async () => {
  const response = await axios.get(`${API_URL}/cost-summary`);
  return response.data; // { total_cost: number }
};
