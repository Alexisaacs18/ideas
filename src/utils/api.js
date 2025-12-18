const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hidden-grass-22b6.alexisaacs18.workers.dev';

export const api = {
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
    if (!response.ok) throw new Error('Registration failed');
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
};

