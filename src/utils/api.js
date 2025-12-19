const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hidden-grass-22b6.alexisaacs18.workers.dev';

export const api = {
  async signup(email, password, name = null, anonymousUserId = null) {
    try {
      const body = { email, password };
      if (name) {
        body.name = name;
      }
      if (anonymousUserId) {
        body.anonymous_user_id = anonymousUserId;
      }
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch {
          throw new Error('Unable to create your account. Please check your internet connection and try again.');
        }
        throw new Error(error.error || 'Unable to create your account. Please try again.');
      }
      return response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        throw new Error('Unable to connect to our servers. Please check your internet connection and try again.');
      }
      throw error;
    }
  },

  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch {
          throw new Error('Unable to sign in. Please check your internet connection and try again.');
        }
        throw new Error(error.error || 'Unable to sign in. Please check your email and password and try again.');
      }
      return response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        throw new Error('Unable to connect to our servers. Please check your internet connection and try again.');
      }
      throw error;
    }
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

    // Store file size for error detection
    const fileSize = file.size;
    const isImage = file.type.startsWith('image/') || /\.(png|jpg|jpeg|heic)$/i.test(file.name);
    const maxSize = isImage ? 1 * 1024 * 1024 : 10 * 1024 * 1024; // 1MB for images, 10MB for others
    const maxSizeMB = isImage ? 1 : 10;

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch {
          // If response isn't JSON, check status codes
          if (response.status === 400 || response.status === 413) {
            throw new Error(`This file is too large. Please upload a smaller file (max ${maxSizeMB}MB for ${isImage ? 'images' : 'documents'}).`);
          }
          if (response.status >= 500) {
            throw new Error('Our servers are having trouble right now. Please try again in a moment.');
          }
          throw new Error('Unable to upload your file. Please try again.');
        }
        
        // Handle specific error messages from backend - check these FIRST
        const errorMsg = error.error || '';
        
        // File size errors
        if (errorMsg.includes('File size must be less than') || 
            errorMsg.includes('too large') || 
            errorMsg.toLowerCase().includes('file size') ||
            response.status === 400 || 
            response.status === 413) {
          // Extract the actual file size from error message if available
          const sizeMatch = errorMsg.match(/(\d+\.?\d*)\s*MB/i);
          if (sizeMatch) {
            throw new Error(`This file is too large (${sizeMatch[1]}MB). Please upload a smaller file (max ${maxSizeMB}MB for ${isImage ? 'images' : 'documents'}).`);
          }
          throw new Error(`This file is too large. Please upload a smaller file (max ${maxSizeMB}MB for ${isImage ? 'images' : 'documents'}).`);
        }
        
        // Text extraction errors
        if (errorMsg.includes('Could not extract text') || errorMsg.includes('extract text')) {
          throw new Error('Unable to read this file. Please make sure it\'s a valid PDF, text, CSV, or image file.');
        }
        
        // Server errors
        if (response.status >= 500) {
          throw new Error('Our servers are having trouble right now. Please try again in a moment.');
        }
        
        // Use the backend error message if available, otherwise generic message
        throw new Error(errorMsg || 'Unable to upload your file. Please try again.');
      }
      return response.json();
    } catch (error) {
      // If we get a network error AND the file is larger than the limit, it's likely a file size issue
      // (the request might be rejected before it reaches the server)
      const isNetworkError = error.message && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError') || 
        error.name === 'TypeError' ||
        error.message.includes('Network request failed')
      );
      
      if (isNetworkError && fileSize > maxSize) {
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);
        throw new Error(`This file is too large (${fileSizeMB}MB). Please upload a smaller file (max ${maxSizeMB}MB for ${isImage ? 'images' : 'documents'}).`);
      }
      
      // Only treat as network error if it's actually a network error (not a user-friendly error we already threw)
      // Check if error message is already user-friendly (doesn't contain technical terms)
      if (isNetworkError && 
          !error.message.includes('too large') && 
          !error.message.includes('Unable to read') &&
          !error.message.includes('servers are having trouble')) {
        throw new Error('Unable to connect to our servers. Please check your internet connection and try again.');
      }
      
      // Re-throw if it's already a user-friendly error
      throw error;
    }
  },

  async sendMessage(question, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, user_id: userId }),
      });
      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch {
          throw new Error('Unable to send your message. Please check your internet connection and try again.');
        }
        throw new Error(error.error || 'Unable to process your message. Please try again.');
      }
      return response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        throw new Error('Unable to connect to our servers. Please check your internet connection and try again.');
      }
      throw error;
    }
  },

  async getDocuments(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents?user_id=${userId}`);
      if (!response.ok) {
        // If it's a 500 error, it might be a database issue, but we'll return empty array
        if (response.status === 500) {
          console.warn('Database error fetching documents, returning empty array');
          return [];
        }
        throw new Error('Unable to load your documents. Please try again.');
      }
      const data = await response.json();
      return data.documents || [];
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        console.warn('Network error fetching documents, returning empty array');
        return [];
      }
      throw new Error('Unable to load your documents. Please try again.');
    }
  },

  async deleteDocument(documentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch {
          throw new Error('Unable to delete the document. Please try again.');
        }
        throw new Error(error.error || 'Unable to delete the document. Please try again.');
      }
      return response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        throw new Error('Unable to connect to our servers. Please check your internet connection and try again.');
      }
      throw error;
    }
  },

  async oauthCallback(code, redirectUri = window.location.origin, anonymousUserId = null, isAdmin = false) {
    console.log('=== API OAUTH CALLBACK ===');
    console.log('Code received:', code ? `${code.substring(0, 20)}...` : 'No code');
    console.log('Redirect URI:', redirectUri);
    console.log('Anonymous User ID:', anonymousUserId);
    console.log('Is Admin:', isAdmin);
    console.log('API Base URL:', API_BASE_URL);
    
    const requestBody = { 
      code, 
      redirect_uri: redirectUri,
      anonymous_user_id: anonymousUserId, // Send anonymous userId to transfer data on first sign-in
      is_admin: isAdmin // Flag for admin authentication
    };
    
    console.log('Request body:', { ...requestBody, code: code ? `${code.substring(0, 20)}...` : null });
    
    const response = await fetch(`${API_BASE_URL}/api/auth/oauth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('OAuth callback error:', error);
      throw new Error(error.error || 'OAuth callback failed');
    }
    
    const result = await response.json();
    console.log('OAuth callback success:', result);
    return result;
  },

  async addLink(url, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, user_id: userId }),
      });
      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch {
          throw new Error('Unable to add the link. Please check your internet connection and try again.');
        }
        throw new Error(error.error || 'Unable to add the link. Please make sure the URL is publicly accessible and try again.');
      }
      return response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        throw new Error('Unable to connect to our servers. Please check your internet connection and try again.');
      }
      throw error;
    }
  },

  async addText(title, content, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, user_id: userId }),
      });
      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch {
          throw new Error('Unable to save your text. Please check your internet connection and try again.');
        }
        throw new Error(error.error || 'Unable to save your text. Please try again.');
      }
      return response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
        throw new Error('Unable to connect to our servers. Please check your internet connection and try again.');
      }
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete user' }));
        throw new Error(error.error || 'Failed to delete user');
      }

      return response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Unable to connect to our servers. Please check your internet connection and try again.');
      }
      throw error;
    }
  },

  async clearR2Documents() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/r2/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to clear R2 documents' }));
        throw new Error(error.error || 'Failed to clear R2 documents');
      }

      return response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Unable to connect to our servers. Please check your internet connection and try again.');
      }
      throw error;
    }
  },
};

