/**
 * Cloudflare Worker backend for Document Q&A Application
 * Handles authentication, document upload, embeddings, and chat
 */

import { HfInference } from '@huggingface/inference';

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Utility: Generate UUID
function generateId() {
  return crypto.randomUUID();
}

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

// Utility: Parse JSON with error handling
async function parseJSON(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}

// Utility: Cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

// Utility: Chunk text into 1500-character segments with 100-character overlap
// Larger chunks reduce total number and stay under subrequest limit
function chunkText(text, chunkSize = 1500, overlap = 100) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to preserve sentence boundaries
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const boundary = Math.max(lastPeriod, lastNewline);
      
      if (boundary > start + chunkSize * 0.5) {
        end = boundary + 1;
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    start = end - overlap;
    if (start >= text.length) break;
  }
  
  return chunks;
}

// Utility: Validate if text is readable
function isValidText(text) {
  if (!text || text.length === 0) return false;
  // Check if at least 70% of characters are printable
  const printableChars = text.match(/[\x20-\x7E\n\r\t]/g)?.length || 0;
  const ratio = printableChars / text.length;
  return ratio > 0.7;
}

// Utility: Clean extracted text
function cleanText(text) {
  return text
    .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-printable characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();
}

// Utility: Extract text from file (supports TXT and PDF)
async function extractTextFromFile(file, filename) {
  const extension = filename.split('.').pop().toLowerCase();
  
  console.log('=== FILE EXTRACTION ===');
  console.log('Filename:', filename);
  console.log('Extension:', extension);
  
  if (extension === 'txt') {
    const text = await file.text();
    console.log('TXT file - Text length:', text.length);
    console.log('Text preview:', text.substring(0, 200));
    console.log('Is readable:', isValidText(text));
    
    if (!isValidText(text)) {
      throw new Error('TXT file contains binary data or is not readable');
    }
    
    return cleanText(text);
  } else if (extension === 'pdf') {
    try {
      console.log('=== PDF EXTRACTION DEBUG ===');
      const arrayBuffer = await file.arrayBuffer();
      console.log('Buffer size:', arrayBuffer.byteLength);
      
      // Convert to Uint8Array for processing
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Decode as Latin-1 to preserve byte values (PDFs use various encodings)
      const decoder = new TextDecoder('latin1', { fatal: false });
      const pdfString = decoder.decode(uint8Array);
      
      console.log('PDF string length:', pdfString.length);
      
      let extractedText = '';
      const extractedStrings = new Set(); // Avoid duplicates
      
      // Method 1: Extract text from PDF text objects - parentheses format (most common)
      // PDF text is often in format: (text here) Tj or (text here) '
      const textObjectRegex = /\((?:[^()\\]|\\.|\\\d{1,3})*\)/g;
      let match;
      while ((match = textObjectRegex.exec(pdfString)) !== null) {
        let textStr = match[0].slice(1, -1); // Remove parentheses
        
        // Decode PDF escape sequences
        textStr = textStr
          .replace(/\\([nrtbf()\\])/g, (m, char) => {
            const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
            return escapes[char] || m;
          })
          .replace(/\\(\d{1,3})/g, (m, octal) => {
            const code = parseInt(octal, 8);
            return code >= 32 && code <= 126 ? String.fromCharCode(code) : '';
          })
          .replace(/\\x([0-9A-Fa-f]{2})/g, (m, hex) => {
            const code = parseInt(hex, 16);
            return code >= 32 && code <= 126 ? String.fromCharCode(code) : '';
          });
        
        // Only add if it looks like real text (has letters and reasonable length)
        if (textStr.length >= 2 && /[a-zA-Z]/.test(textStr) && isValidText(textStr)) {
          const normalized = textStr.trim();
          if (normalized.length > 0 && !extractedStrings.has(normalized)) {
            extractedStrings.add(normalized);
            extractedText += normalized + ' ';
          }
        }
      }
      
      // Method 2: Extract from hex strings <hexdata>
      const hexStringRegex = /<([0-9A-Fa-f\s]+)>/g;
      while ((match = hexStringRegex.exec(pdfString)) !== null) {
        const hexStr = match[1].replace(/\s/g, '');
        if (hexStr.length >= 4 && hexStr.length % 2 === 0) {
          let decoded = '';
          for (let i = 0; i < hexStr.length; i += 2) {
            const byte = parseInt(hexStr.substr(i, 2), 16);
            // Only include printable ASCII
            if (byte >= 32 && byte <= 126) {
              decoded += String.fromCharCode(byte);
            }
          }
          
          if (decoded.length >= 2 && /[a-zA-Z]/.test(decoded) && isValidText(decoded)) {
            const normalized = decoded.trim();
            if (normalized.length > 0 && !extractedStrings.has(normalized)) {
              extractedStrings.add(normalized);
              extractedText += normalized + ' ';
            }
          }
        }
      }
      
      // Method 3: Extract from stream objects (for embedded text)
      if (extractedText.length < 200) {
        const streamRegex = /stream[\s\S]{0,50000}?endstream/g;
        const streamMatches = pdfString.match(streamRegex) || [];
        
        for (const streamMatch of streamMatches) {
          const streamContent = streamMatch.replace(/stream|endstream/g, '');
          
          // Look for text patterns in streams
          const textPattern = /[A-Za-z]{3,20}/g;
          const words = streamContent.match(textPattern);
          
          if (words && words.length > 5) {
            // Check if words form coherent text
            const sample = words.slice(0, 20).join(' ');
            if (isValidText(sample) && /[aeiouAEIOU]/.test(sample)) {
              extractedText += words.join(' ') + ' ';
            }
          }
        }
      }
      
      console.log('Extracted text length:', extractedText.length);
      console.log('First 500 chars:', extractedText.substring(0, 500));
      
      if (extractedText.length === 0) {
        throw new Error('PDF text extraction returned no text. The PDF may be image-based, encrypted, or have no extractable text.');
      }
      
      // Validate the text is readable
      // Check if text contains actual common words (not binary garbage)
      const commonWords = /\b(the|and|is|was|for|with|at|from|to|a|an|in|on|of|as|be|or|by|this|that|have|has|had|will|would|should|could|may|might|can|must|shall|are|were|been|being|been|has|have|had|do|does|did|will|would|should|could|may|might|can|must|shall)\b/i;
      const hasRealWords = commonWords.test(extractedText);
      const printableChars = extractedText.match(/[a-zA-Z0-9\s.,!?;:'"()-]/g)?.length || 0;
      const hasMostlyPrintable = printableChars / extractedText.length > 0.5;
      
      console.log('Has real words:', hasRealWords);
      console.log('Mostly printable:', hasMostlyPrintable);
      console.log('Printable ratio:', (printableChars / extractedText.length).toFixed(3));
      
      if (!hasRealWords || !hasMostlyPrintable) {
        throw new Error('PDF text extraction failed - extracted text appears to be corrupted or contains binary data. The PDF may be image-based or encrypted.');
      }
      
      // Clean the text
      const cleanedText = cleanText(extractedText);
      console.log('Cleaned text length:', cleanedText.length);
      console.log('Cleaned text preview (first 300):', cleanedText.substring(0, 300));
      if (cleanedText.length > 600) {
        console.log('Cleaned text preview (middle):', cleanedText.substring(cleanedText.length / 2, cleanedText.length / 2 + 200));
      }
      
      if (cleanedText.length < 50) {
        throw new Error('PDF extraction returned too little text. The PDF may be image-based or have no extractable text.');
      }
      
      return cleanedText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  } else {
    throw new Error(`Unsupported file type: ${extension}`);
  }
}

// HuggingFace API: Get embeddings (supports single text or batch)
async function getEmbeddings(texts, apiKey) {
  // Accept single string or array
  const isBatch = Array.isArray(texts);
  const inputs = isBatch ? texts : [texts];
  
  console.log('=== EMBEDDING DEBUG (SDK) ===');
  console.log('API Key exists:', !!apiKey);
  console.log('API Key starts with:', apiKey ? apiKey.substring(0, 7) + '...' : 'N/A');
  console.log('Input count:', inputs.length);
  console.log('Is batch:', isBatch);
  
  try {
    // Use HuggingFace SDK
    const hf = new HfInference(apiKey);
    
    console.log('Using HuggingFace SDK for feature extraction');
    
    // For batch, pass array; for single, pass string
    const result = await hf.featureExtraction({
      model: 'sentence-transformers/all-mpnet-base-v2',
      inputs: isBatch ? inputs : inputs[0],
    });
    
    console.log('SDK Response type:', Array.isArray(result) ? 'array' : typeof result);
    if (Array.isArray(result)) {
      console.log('Array length:', result.length);
      if (result[0]) {
        console.log('First element type:', Array.isArray(result[0]) ? 'array' : typeof result[0]);
        if (Array.isArray(result[0])) {
          console.log('First embedding dimensions:', result[0].length);
        }
      }
    }
    
    // SDK returns array of arrays for batch, single array for single input
    if (Array.isArray(result)) {
      if (result[0] && Array.isArray(result[0])) {
        return isBatch ? result : result[0];
      }
      return isBatch ? result : result;
    }
    
    // If result is a single array (for single input)
    if (Array.isArray(result)) {
      return result;
    }
    
    throw new Error('Unexpected response format from HuggingFace SDK');
  } catch (error) {
    console.error('HuggingFace SDK error:', error.message);
    throw new Error(`HuggingFace embedding API error: ${error.message}`);
  }
}

// Groq API: Generate answer from question and context
async function generateAnswer(question, context, env) {
  console.log('=== GROQ API DEBUG ===');
  console.log('Question:', question);
  console.log('Context length:', context.length);
  console.log('Context preview:', context.substring(0, 200));
  
  // Check for API key
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey || (typeof apiKey === 'string' && apiKey.trim() === '')) {
    console.error('GROQ_API_KEY missing or empty');
    throw new Error('Groq API key not configured. Please set GROQ_API_KEY secret in Cloudflare dashboard.');
  }
  
  console.log('API Key exists:', !!apiKey);
  console.log('API Key starts with:', apiKey ? apiKey.substring(0, 7) + '...' : 'N/A');
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',  // High quality, versatile model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that answers questions based only on the provided context. If the answer is not in the context, say so.'
          },
          {
            role: 'user',
            content: `Context from documents:\n\n${context}\n\nQuestion: ${question}\n\nAnswer based only on the context above:`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });
    
    console.log('Groq API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Groq API response keys:', Object.keys(data));
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const answer = data.choices[0].message.content;
      console.log('Extracted answer length:', answer.length);
      console.log('Answer:', answer);
      return answer;
    }
    
    console.error('Unexpected Groq response format:', JSON.stringify(data).substring(0, 200));
    throw new Error('Unexpected response format from Groq API');
  } catch (error) {
    console.error('Groq API error:', error.message);
    throw new Error(`Groq API error: ${error.message}`);
  }
}

// API Endpoint: Register user
async function handleRegister(request, env) {
  try {
    // Check if DB binding exists
    if (!env.DB) {
      const availableBindings = Object.keys(env).filter(k => !k.startsWith('_'));
      console.error('DB binding not found. Available bindings:', availableBindings);
      return new Response(
        JSON.stringify({ 
          error: 'Database not configured. DB binding missing.',
          debug: {
            availableBindings,
            hasDB: false,
            envKeys: availableBindings
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await parseJSON(request);
    if (!body || !body.email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const email = body.email.trim().toLowerCase();
    if (!email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use provided userId or check by email
    const providedUserId = body.user_id;
    
    if (providedUserId) {
      // Check if user with this ID exists
      const existing = await env.DB.prepare(
        'SELECT id FROM users WHERE id = ?'
      ).bind(providedUserId).first();
      
      if (existing) {
        return new Response(
          JSON.stringify({ user_id: existing.id }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Create user with provided ID
      await env.DB.prepare(
        'INSERT INTO users (id, email) VALUES (?, ?)'
      ).bind(providedUserId, email).run();
      
      return new Response(
        JSON.stringify({ user_id: providedUserId }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user exists by email
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existing) {
      return new Response(
        JSON.stringify({ user_id: existing.id }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create new user
    const userId = generateId();
    await env.DB.prepare(
      'INSERT INTO users (id, email) VALUES (?, ?)'
    ).bind(userId, email).run();
    
    return new Response(
      JSON.stringify({ user_id: userId }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// API Endpoint: Upload document
async function handleUpload(request, env) {
  try {
    // Check for API key (try both possible names)
    let apiKey = env.HUGGINGFACE;
    if (!apiKey && env['Hugging Face']) {
      apiKey = env['Hugging Face'];
    }
    if (!apiKey || (typeof apiKey === 'string' && apiKey.trim() === '')) {
      console.error('HUGGINGFACE missing or empty');
      console.error('Available env keys:', Object.keys(env).filter(k => k.includes('HUGGING') || k.includes('API') || k.includes('Hugging')));
      return new Response(
        JSON.stringify({ 
          error: 'HuggingFace API key not configured. Please verify HUGGINGFACE secret is set in Cloudflare dashboard for worker "hidden-grass-22b6".',
          debug: 'Secret not found in environment',
          availableKeys: Object.keys(env).filter(k => k.includes('HUGGING') || k.includes('API') || k.includes('Hugging'))
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file');
    const userId = formData.get('user_id');
    
    if (!file || !userId) {
      return new Response(
        JSON.stringify({ error: 'File and user_id are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Check document limit (50 per user)
    const docCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM documents WHERE user_id = ?'
    ).bind(userId).first();
    
    if (docCount && docCount.count >= 50) {
      return new Response(
        JSON.stringify({ error: 'Document limit reached (50 documents per user)' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify user exists, create if not
    let user = await env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(userId).first();
    
    if (!user) {
      // Auto-create user with temporary email
      const tempEmail = `${userId}@temp.local`;
      await env.DB.prepare(
        'INSERT INTO users (id, email) VALUES (?, ?)'
      ).bind(userId, tempEmail).run();
    }
    
    const filename = file.name;
    const fileSize = file.size;
    
    // Extract text from file
    const text = await extractTextFromFile(file, filename);
    
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not extract text from file' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Chunk text
    const chunks = chunkText(text);
    
    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text chunks created from file' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Enforce maximum chunk limit
    const MAX_CHUNKS = 50;
    if (chunks.length > MAX_CHUNKS) {
      return new Response(
        JSON.stringify({ 
          error: 'Document too large', 
          message: `This document would create ${chunks.length} chunks. Maximum is ${MAX_CHUNKS}. Try uploading a shorter document or split it into multiple files.`
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate embeddings in batches to reduce API calls
    const BATCH_SIZE = 10; // Process 10 chunks at a time
    const embeddings = [];
    let lastError = null;
    
    console.log(`Processing ${chunks.length} chunks in batches of ${BATCH_SIZE}`);
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchIndices = batch.map((_, idx) => i + idx);
      
      try {
        const startTime = Date.now();
        const batchEmbeddings = await getEmbeddings(batch, apiKey);
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} took ${Date.now() - startTime}ms`);
        
        // batchEmbeddings is array of arrays (one per chunk)
        for (let j = 0; j < batch.length; j++) {
          embeddings.push({
            chunk: batch[j],
            embedding: JSON.stringify(batchEmbeddings[j]),
            index: batchIndices[j],
          });
        }
        
        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error generating embeddings for batch starting at ${i}:`, error);
        lastError = error;
        // Continue with other batches
      }
    }
    
    if (embeddings.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate embeddings',
          details: lastError ? lastError.message : 'Unknown error',
          chunkCount: chunks.length
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Store file in R2
    const documentId = generateId();
    const filePath = `${userId}/${documentId}/${filename}`;
    
    // Reset file stream for R2 upload
    const fileBuffer = await file.arrayBuffer();
    await env.DOCS_BUCKET.put(filePath, fileBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
    });
    
    // Save document metadata
    await env.DB.prepare(
      'INSERT INTO documents (id, user_id, filename, file_path, size_bytes) VALUES (?, ?, ?, ?, ?)'
    ).bind(documentId, userId, filename, filePath, fileSize).run();
    
    // Save embeddings in batch using D1 batch API for efficiency
    const embeddingStatements = embeddings.map((emb) => {
      const embeddingId = generateId();
      return env.DB.prepare(
        'INSERT INTO embeddings (id, document_id, chunk_text, embedding, chunk_index) VALUES (?, ?, ?, ?, ?)'
      ).bind(embeddingId, documentId, emb.chunk, emb.embedding, emb.index);
    });
    
    // Execute all inserts in a single batch transaction
    await env.DB.batch(embeddingStatements);
    
    return new Response(
      JSON.stringify({
        document_id: documentId,
        filename,
        chunks_created: embeddings.length,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// API Endpoint: Chat
async function handleChat(request, env) {
  try {
    // Check for API key (try both possible names)
    let apiKey = env.HUGGINGFACE;
    if (!apiKey && env['Hugging Face']) {
      apiKey = env['Hugging Face'];
    }
    if (!apiKey || (typeof apiKey === 'string' && apiKey.trim() === '')) {
      console.error('HUGGINGFACE missing or empty');
      return new Response(
        JSON.stringify({ error: 'HuggingFace API key not configured. Please set HUGGINGFACE secret in Cloudflare dashboard.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await parseJSON(request);
    if (!body || !body.question || !body.user_id) {
      return new Response(
        JSON.stringify({ error: 'question and user_id are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { question, user_id } = body;
    
    // Verify user exists
    const user = await env.DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(user_id).first();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get embedding for question
    const questionEmbedding = await getEmbeddings(question, apiKey);
    
    // Get all embeddings for this user's documents
    const allEmbeddings = await env.DB.prepare(`
      SELECT e.id, e.document_id, e.chunk_text, e.embedding, e.chunk_index,
             d.filename, d.id as doc_id
      FROM embeddings e
      JOIN documents d ON e.document_id = d.id
      WHERE d.user_id = ?
    `).bind(user_id).all();
    
    if (!allEmbeddings.results || allEmbeddings.results.length === 0) {
      return new Response(
        JSON.stringify({
          answer: 'No documents found. Please upload documents first.',
          sources: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Calculate cosine similarity for each embedding
    const similarities = [];
    for (const row of allEmbeddings.results) {
      try {
        const embedding = JSON.parse(row.embedding);
        const similarity = cosineSimilarity(questionEmbedding, embedding);
        similarities.push({
          similarity,
          document_id: row.doc_id,
          filename: row.filename,
          chunk_text: row.chunk_text,
          chunk_index: row.chunk_index,
        });
      } catch (error) {
        console.error('Error parsing embedding:', error);
      }
    }
    
    // Sort by similarity and get top 3
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topChunks = similarities.slice(0, 3);
    
    console.log('=== CHAT ENDPOINT DEBUG ===');
    console.log('Total similarities found:', similarities.length);
    console.log('Top chunks selected:', topChunks.length);
    console.log('Top chunks structure:', topChunks.map(c => ({
      similarity: c.similarity,
      has_chunk_text: !!c.chunk_text,
      chunk_text_length: c.chunk_text?.length || 0,
      filename: c.filename,
      document_id: c.document_id
    })));
    
    if (topChunks.length === 0) {
      return new Response(
        JSON.stringify({
          answer: 'Could not find relevant information in your documents.',
          sources: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Build context from top chunks
    const context = topChunks
      .map(chunk => chunk.chunk_text)
      .filter(Boolean) // Remove any null/undefined
      .join('\n\n---\n\n');
    
    console.log('Context built, length:', context.length);
    
    // Get answer from Groq API
    const answer = await generateAnswer(question, context, env);
    
    // Format sources
    const sources = topChunks.map(chunk => ({
      doc_id: chunk.document_id,
      filename: chunk.filename,
      chunk_text: chunk.chunk_text.substring(0, 200) + (chunk.chunk_text.length > 200 ? '...' : ''),
    }));
    
    // Save message to history
    const messageId = generateId();
    await env.DB.prepare(
      'INSERT INTO messages (id, user_id, question, answer, sources) VALUES (?, ?, ?, ?, ?)'
    ).bind(messageId, user_id, question, answer, JSON.stringify(sources)).run();
    
    return new Response(
      JSON.stringify({
        answer,
        sources,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// API Endpoint: Get documents
async function handleGetDocuments(request, env) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'user_id query parameter is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const documents = await env.DB.prepare(
      'SELECT id, filename, upload_date, size_bytes FROM documents WHERE user_id = ? ORDER BY upload_date DESC'
    ).bind(userId).all();
    
    return new Response(
      JSON.stringify({
        documents: documents.results || [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// API Endpoint: Delete document
async function handleDeleteDocument(request, env) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const documentId = pathParts[pathParts.length - 1];
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get document info
    const document = await env.DB.prepare(
      'SELECT file_path FROM documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Delete from R2
    try {
      await env.DOCS_BUCKET.delete(document.file_path);
    } catch (error) {
      console.error('Error deleting from R2:', error);
      // Continue with DB deletion even if R2 deletion fails
    }
    
    // Delete embeddings
    await env.DB.prepare(
      'DELETE FROM embeddings WHERE document_id = ?'
    ).bind(documentId).run();
    
    // Delete document
    await env.DB.prepare(
      'DELETE FROM documents WHERE id = ?'
    ).bind(documentId).run();
    
    return new Response(
      JSON.stringify({ message: 'Document deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
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
    const path = url.pathname;
    
    try {
      let response;
      
      if (path === '/api/auth/register' && request.method === 'POST') {
        response = await handleRegister(request, env);
      } else if (path === '/api/upload' && request.method === 'POST') {
        response = await handleUpload(request, env);
      } else if (path === '/api/chat' && request.method === 'POST') {
        response = await handleChat(request, env);
      } else if (path === '/api/documents' && request.method === 'GET') {
        response = await handleGetDocuments(request, env);
      } else if (path.startsWith('/api/documents/') && request.method === 'DELETE') {
        response = await handleDeleteDocument(request, env);
      } else if (path === '/api/debug/secret' && request.method === 'GET') {
        // Debug endpoint to check if secret is accessible
        const hasKey = !!env.HUGGINGFACE;
        const keyLength = env.HUGGINGFACE ? env.HUGGINGFACE.length : 0;
        response = new Response(
          JSON.stringify({ 
            hasKey,
            keyLength,
            keyPrefix: env.HUGGINGFACE ? env.HUGGINGFACE.substring(0, 4) + '...' : 'N/A'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else if (path === '/api/debug/bindings' && request.method === 'GET') {
        // Debug endpoint to check bindings
        response = new Response(
          JSON.stringify({
            hasDB: !!env.DB,
            hasDOCS_BUCKET: !!env.DOCS_BUCKET,
            hasHUGGINGFACE: !!env.HUGGINGFACE,
            allKeys: Object.keys(env).filter(k => !k.startsWith('_')),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else if (path === '/' && request.method === 'GET') {
        // Root endpoint - return API information
        response = new Response(
          JSON.stringify({
            service: 'Document Q&A API',
            version: '1.0.0',
            endpoints: {
              'POST /api/auth/register': 'Register a new user',
              'POST /api/upload': 'Upload a document (PDF/TXT)',
              'POST /api/chat': 'Send a chat message',
              'GET /api/documents?user_id=X': 'List documents for a user',
              'DELETE /api/documents/:id': 'Delete a document',
              'GET /api/debug/secret': 'Debug: Check API key (dev only)',
              'GET /api/debug/bindings': 'Debug: Check bindings (dev only)',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        response = new Response(
          JSON.stringify({ error: 'Not found', path: path }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      return addCorsHeaders(response);
    } catch (error) {
      console.error('Unhandled error:', error);
      return addCorsHeaders(
        new Response(
          JSON.stringify({ error: 'Internal server error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
  },
};

