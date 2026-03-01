const API_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const api = {
  login: async (username, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) localStorage.setItem('token', data.token);
    return data;
  },

  register: async (username, password) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  getNotes: async () => {
    const res = await fetch(`${API_URL}/notes`, { headers: getHeaders() });
    return res.json();
  },

  createNote: async (note) => {
    const res = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(note)
    });
    return res.json();
  },

  updateNote: async (id, note) => {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(note)
    });
    return res.json();
  },

  revealNote: async (id) => {
    const res = await fetch(`${API_URL}/notes/${id}/reveal`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return res.json();
  },

  unrevelNote: async (id) => {
    const res = await fetch(`${API_URL}/notes/${id}/unreveal`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return res.json();
  },

  likeNote: async (id) => {
    const res = await fetch(`${API_URL}/notes/${id}/like`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return res.json();
  },

  unlikeNote: async (id) => {
    const res = await fetch(`${API_URL}/notes/${id}/unlike`, {
      method: 'PATCH',
      headers: getHeaders()
    });
    return res.json();
  },

  deleteNote: async (id) => {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return res.json();
  },

  logout: () => {
    localStorage.removeItem('token');
  }
};
