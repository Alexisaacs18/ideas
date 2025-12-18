const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hidden-grass-22b6.alexisaacs18.workers.dev';

export const api = {
  async signup(email, password, name = null) {
    const body = { email, password };
    if (name) {
      body.name = name;
    }
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Signup failed' }));
      throw new Error(error.error || 'Signup failed');
    }
    return response.json();
  },

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(error.error || 'Login failed');
    }
    return response.json();
  },

  async register(email, userId = null) {
    const body = { email };
    if (userId) {
      body.user_id = userId;
    }
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(error.error || 'Registration failed');
    }
    return response.json();
  },

  async uploadFile(file, userId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      // Include more details in error message
      const errorMsg = error.error || 'Upload failed';
      const details = error.details ? ` (${error.details})` : '';
      const chunkCount = error.chunkCount ? ` - ${error.chunkCount} chunks processed` : '';
      throw new Error(errorMsg + details + chunkCount);
    }
    return response.json();
  },

  async sendMessage(question, userId) {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, user_id: userId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Chat failed');
    }
    return response.json();
  },

  async getDocuments(userId) {
    const response = await fetch(`${API_BASE_URL}/api/documents?user_id=${userId}`);
    if (!response.ok) {
      // If it's a 500 error, it might be a database issue, but we'll return empty array
      if (response.status === 500) {
        console.warn('Database error fetching documents, returning empty array');
        return [];
      }
      throw new Error('Failed to fetch documents');
    }
    const data = await response.json();
    return data.documents || [];
  },

  async deleteDocument(documentId) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Delete failed');
    }
    return response.json();
  },

  async oauthCallback(code, redirectUri = window.location.origin, anonymousUserId = null) {
    const response = await fetch(`${API_BASE_URL}/api/auth/oauth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code, 
        redirect_uri: redirectUri,
        anonymous_user_id: anonymousUserId // Send anonymous userId to transfer data on first sign-in
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'OAuth callback failed');
    }
    return response.json();
  },

  async addLink(url, userId) {
    const response = await fetch(`${API_BASE_URL}/api/documents/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, user_id: userId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add link');
    }
    return response.json();
  },

  async addText(title, content, userId) {
    const response = await fetch(`${API_BASE_URL}/api/documents/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, user_id: userId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save text');
    }
    return response.json();
  },
};

