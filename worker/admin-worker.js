/**
 * Admin Worker for Prosey
 * Handles admin UI and admin API endpoints
 * Shares the same D1 and R2 bindings as the main worker
 */

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Utility: Add CORS headers to response
function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// API Endpoint: Admin Stats
async function handleAdminStats(request, env) {
  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all users
    console.log('Fetching all users from database...');
    const allUsers = await env.DB.prepare(
      'SELECT id, email FROM users'
    ).all();
    
    console.log('Users query result:', {
      success: !!allUsers,
      resultsLength: allUsers?.results?.length || 0,
      firstUser: allUsers?.results?.[0] || null
    });

    if (!allUsers.results || allUsers.results.length === 0) {
      console.log('No users found in database');
      return new Response(
        JSON.stringify({ users: [], totals: {
          totalUsers: 0,
          signedInUsers: 0,
          anonymousUsers: 0,
          totalDocuments: 0,
          totalChats: 0,
          averageChatsPerDay: 0,
        }}),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          } 
        }
      );
    }
    
    console.log(`Found ${allUsers.results.length} users in database`);

    const users = [];
    let totalDocuments = 0;
    let totalChats = 0;
    let signedInUsers = 0;
    let anonymousUsers = 0;
    let activeUsers = 0; // Users active in the last 30 days
    
    // Verify total document count directly from database
    const totalDocsQuery = await env.DB.prepare('SELECT COUNT(*) as count FROM documents').first();
    const actualTotalDocuments = totalDocsQuery?.count || 0;
    console.log(`[AdminStats] Direct database query: ${actualTotalDocuments} total documents`);

    // Calculate stats for each user
    for (const user of allUsers.results) {
      const userId = user.id;
      const email = user.email;

      // Count documents
      const docCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM documents WHERE user_id = ?'
      ).bind(userId).first();
      const documentCount = docCount?.count || 0;
      totalDocuments += documentCount;
      
      // Log for debugging
      if (documentCount > 0) {
        console.log(`[AdminStats] User ${userId} (${email}): ${documentCount} documents`);
      }

      // Count total messages (as proxy for chats since we don't track separate chat sessions)
      const messageCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM messages WHERE user_id = ?'
      ).bind(userId).first();
      const totalMessages = messageCount?.count || 0;

      // Estimate chats: count unique days with messages
      // Get all message timestamps and group by day
      const allMessages = await env.DB.prepare(
        'SELECT created_at FROM messages WHERE user_id = ? ORDER BY created_at ASC'
      ).bind(userId).all();

      let totalChatsForUser = 0;
      let averageChatsPerDay = 0;

      if (allMessages.results && allMessages.results.length > 0) {
        // Group messages by day (timestamp in milliseconds)
        const daysSet = new Set();
        let firstTimestamp = null;
        let lastTimestamp = null;

        for (const msg of allMessages.results) {
          // created_at is stored as unix timestamp (seconds), convert to milliseconds
          const timestamp = msg.created_at ? parseInt(msg.created_at) * 1000 : Date.now();
          if (!firstTimestamp) firstTimestamp = timestamp;
          lastTimestamp = timestamp;
          
          // Convert to day (YYYY-MM-DD format)
          const date = new Date(timestamp);
          const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          daysSet.add(dayKey);
        }

        const uniqueDays = daysSet.size;
        
        // Estimate chats: at least 1 chat per day with messages
        // Plus additional chats based on message volume (rough estimate: 10 messages per chat)
        const estimatedChatsFromVolume = Math.ceil(totalMessages / 10);
        totalChatsForUser = Math.max(uniqueDays, estimatedChatsFromVolume);

        // Calculate average chats per day
        if (firstTimestamp && lastTimestamp) {
          const daysDiff = Math.max(1, Math.ceil((lastTimestamp - firstTimestamp) / (1000 * 60 * 60 * 24)) + 1);
          averageChatsPerDay = totalChatsForUser / daysDiff;
        } else {
          averageChatsPerDay = totalChatsForUser;
        }
      }

      totalChats += totalChatsForUser;

      // Calculate last activity - check most recent message or document
      let lastActivity = null;
      
      // Get most recent message timestamp
      const lastMessage = await env.DB.prepare(
        'SELECT created_at FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(userId).first();
      
      // Get most recent document upload timestamp
      const lastDocument = await env.DB.prepare(
        'SELECT upload_date FROM documents WHERE user_id = ? ORDER BY upload_date DESC LIMIT 1'
      ).bind(userId).first();
      
      // Get the most recent activity (messages.created_at and documents.upload_date are both unix timestamps in seconds)
      const messageTimestamp = lastMessage?.created_at ? parseInt(lastMessage.created_at) : null;
      const documentTimestamp = lastDocument?.upload_date ? parseInt(lastDocument.upload_date) : null;
      
      if (messageTimestamp || documentTimestamp) {
        // Take the maximum (most recent) timestamp
        if (messageTimestamp && documentTimestamp) {
          lastActivity = Math.max(messageTimestamp, documentTimestamp);
        } else {
          lastActivity = messageTimestamp || documentTimestamp;
        }
      }

      // Determine if signed in or anonymous
      const isSignedIn = email && !email.endsWith('@temp.local');

      if (isSignedIn) {
        signedInUsers++;
      } else {
        anonymousUsers++;
      }

      // Check if user is active (activity within last 30 days)
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
      const isActive = lastActivity && lastActivity >= thirtyDaysAgo;
      if (isActive) {
        activeUsers++;
      }

      users.push({
        user_id: userId,
        email: email && !email.endsWith('@temp.local') ? email : null,
        documentCount,
        totalChats: totalChatsForUser,
        averageChatsPerDay,
        lastActivity, // Unix timestamp in seconds
      });
    }

    // Calculate overall average chats per day
    const overallAverageChatsPerDay = users.length > 0 
      ? users.reduce((sum, u) => sum + u.averageChatsPerDay, 0) / users.length 
      : 0;

    // Use the actual count from database instead of sum
    const totals = {
      totalUsers: allUsers.results.length,
      signedInUsers,
      anonymousUsers,
      activeUsers, // Users active in the last 30 days
      totalDocuments: actualTotalDocuments, // Use direct database count instead of sum
      totalChats,
      averageChatsPerDay: overallAverageChatsPerDay,
    };
    
    console.log(`[AdminStats] Final totals:`, {
      totalUsers: totals.totalUsers,
      totalDocuments: totals.totalDocuments,
      calculatedSum: totalDocuments, // What we calculated by summing
      actualCount: actualTotalDocuments // What database says
    });

    return new Response(
      JSON.stringify({ users, totals }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        } 
      }
    );
  } catch (error) {
    console.error('Admin stats error:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch admin stats', details: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        } 
      }
    );
  }
}

// API Endpoint: Delete User
async function handleDeleteUser(request, env) {
  try {
    const url = new URL(request.url);
    // Path format: /api/admin/users/{userId}/delete
    const pathParts = url.pathname.split('/').filter(p => p);
    const userIdIndex = pathParts.indexOf('users') + 1;
    const userId = pathParts[userIdIndex];
    
    if (!userId || userId === 'delete') {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get all documents for this user
    const documents = await env.DB.prepare(
      'SELECT id, file_path FROM documents WHERE user_id = ?'
    ).bind(userId).all();
    
    // Delete all R2 files for this user
    let deletedFiles = 0;
    let failedFiles = 0;
    
    if (documents.results && documents.results.length > 0) {
      for (const doc of documents.results) {
        try {
          // Delete encrypted file (file_path now points directly to .enc file)
          await env.DOCS_BUCKET.delete(doc.file_path);
          deletedFiles++;
          
          // Also try to delete old format files if they exist (backward compatibility)
          const pathParts = doc.file_path.split('/');
          if (pathParts.length >= 2 && !doc.file_path.endsWith('.enc')) {
            // Old format: try to delete both original and encrypted.txt
            try {
              await env.DOCS_BUCKET.delete(doc.file_path);
              const encryptedPath = `${pathParts[0]}/${pathParts[1]}/encrypted.txt`;
              await env.DOCS_BUCKET.delete(encryptedPath);
            } catch (e) {
              // Ignore if old format files don't exist
            }
          }
        } catch (error) {
          console.error(`Error deleting R2 file ${doc.file_path}:`, error);
          failedFiles++;
        }
      }
    }
    
    // Delete all embeddings for user's documents
    const documentIds = documents.results?.map(d => d.id) || [];
    if (documentIds.length > 0) {
      for (const docId of documentIds) {
        await env.DB.prepare(
          'DELETE FROM embeddings WHERE document_id = ?'
        ).bind(docId).run();
      }
    }
    
    // Delete all documents
    await env.DB.prepare(
      'DELETE FROM documents WHERE user_id = ?'
    ).bind(userId).run();
    
    // Delete all messages
    await env.DB.prepare(
      'DELETE FROM messages WHERE user_id = ?'
    ).bind(userId).run();
    
    // Delete user
    await env.DB.prepare(
      'DELETE FROM users WHERE id = ?'
    ).bind(userId).run();
    
    return new Response(
      JSON.stringify({ 
        message: 'User deleted successfully',
        deletedFiles,
        failedFiles,
        deletedDocuments: documentIds.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// API Endpoint: Clear all R2 documents (Admin only)
async function handleClearR2Documents(request, env) {
  try {
    // List all objects in R2 bucket
    const objects = await env.DOCS_BUCKET.list();
    
    let deletedCount = 0;
    let failedCount = 0;
    
    // Delete all objects
    if (objects.objects && objects.objects.length > 0) {
      for (const obj of objects.objects) {
        try {
          await env.DOCS_BUCKET.delete(obj.key);
          deletedCount++;
        } catch (error) {
          console.error(`Error deleting ${obj.key}:`, error);
          failedCount++;
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        message: 'R2 documents cleared',
        deletedCount,
        failedCount,
        totalObjects: objects.objects?.length || 0
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Clear R2 error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Main handler
export default {
  async fetch(request, env) {
    // Handle OPTIONS for CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders(new Response(null, { status: 204 }));
    }
    
    const url = new URL(request.url);
    let path = url.pathname;
    
    console.log('[Admin Worker] Request:', request.method, path);
    
    // Admin worker ONLY handles /admin* paths
    // If path doesn't start with /admin, return 404
    if (!path.startsWith('/admin')) {
      console.log('[Admin Worker] Rejecting non-admin path:', path);
      return new Response(
        JSON.stringify({ error: 'Not found - admin worker only handles /admin* paths' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Strip /admin prefix for internal routing
    // /admin -> /, /admin/users -> /users, /api/admin/stats -> /api/admin/stats (keep API prefix)
    const internalPath = path.startsWith('/api/admin') ? path : path.replace(/^\/admin/, '') || '/';
    
    try {
      let response;
      
      // Admin API routes (all under /api/admin/)
      if (path.startsWith('/api/admin/users/') && path.endsWith('/delete') && request.method === 'DELETE') {
        response = await handleDeleteUser(request, env);
      } else if (path === '/api/admin/r2/clear' && request.method === 'POST') {
        response = await handleClearR2Documents(request, env);
      } else if (path === '/api/admin/stats' && request.method === 'GET') {
        response = await handleAdminStats(request, env);
      } else if (!path.startsWith('/api/')) {
        // Not an API route - serve admin SPA from dist/admin
        if (env.ASSETS) {
          try {
            // Check if this is a static asset (has file extension)
            const hasFileExtension = /\.\w+$/.test(internalPath) && !internalPath.endsWith('/');
            
            if (hasFileExtension) {
              // It's a static asset - fetch from dist/admin with internal path
              const assetUrl = new URL(internalPath, request.url);
              const assetRequest = new Request(assetUrl, request);
              const assetResponse = await env.ASSETS.fetch(assetRequest);
              if (assetResponse.status === 200) {
                return assetResponse;
              }
              // Asset not found - return 404
              return assetResponse;
            } else {
              // It's an admin SPA route - serve index.html from dist/admin
              // Internally treat / as the base, so /admin -> / internally
              console.log('[Admin Worker] Serving index.html for admin SPA route:', path, '-> internal:', internalPath);
              const indexUrl = new URL('/index.html', request.url);
              const indexRequest = new Request(indexUrl, request);
              const indexResponse = await env.ASSETS.fetch(indexRequest);
              if (indexResponse.status === 200) {
                // Return index.html with original path preserved (no redirect)
                return new Response(indexResponse.body, {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    ...Object.fromEntries(indexResponse.headers),
                    'Content-Type': 'text/html; charset=utf-8'
                  }
                });
              }
              // index.html not found - return 404
              return new Response('index.html not found', { status: 404 });
            }
          } catch (error) {
            console.error('[Admin Worker] Error serving static file:', error);
            // Fallback: try to serve index.html
            try {
              const indexUrl = new URL('/index.html', request.url);
              const indexRequest = new Request(indexUrl, request);
              const indexResponse = await env.ASSETS.fetch(indexRequest);
              if (indexResponse.status === 200) {
                return new Response(indexResponse.body, {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    ...Object.fromEntries(indexResponse.headers),
                    'Content-Type': 'text/html; charset=utf-8'
                  }
                });
              }
            } catch (e) {
              console.error('[Admin Worker] Error serving index.html fallback:', e);
            }
            return new Response('Error serving static files', { status: 500 });
          }
        }
        
        // If ASSETS binding doesn't exist, return error
        return new Response('Static assets not configured', { status: 500 });
      } else {
        // Unknown API route (not /api/admin/*)
        response = new Response(
          JSON.stringify({ error: 'Not found - admin worker only handles /api/admin/* routes' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // If no route matched, return 404
      if (!response) {
        console.log('[Admin Worker] ❌ No route matched for:', path, request.method);
        response = new Response(
          JSON.stringify({ error: 'Not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      return addCorsHeaders(response);
    } catch (error) {
      console.error('[Admin Worker] Unhandled error:', error);
      console.error('[Admin Worker] Error stack:', error.stack);
      return addCorsHeaders(
        new Response(
          JSON.stringify({ error: 'Internal server error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
  },
};

