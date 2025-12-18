/**
 * Cloudflare Worker backend for Document Q&A Application
 * Handles authentication, document upload, embeddings, and chat
 */

import { HfInference } from '@huggingface/inference';
// pdfjs-serverless and papaparse will be imported dynamically to avoid Node.js dependencies

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for production
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

// Utility: Extract text from PDF using CDN version of pdfjs-serverless
async function extractTextFromPDF(arrayBuffer) {
  try {
    console.log('=== PDF EXTRACTION START ===');
    console.log('Buffer size:', arrayBuffer.byteLength);
    
    // Dynamically import pdfjs-serverless to avoid bundling Node.js dependencies
    // This library is designed for serverless environments and should work with nodejs_compat
    const { getDocument } = await import('pdfjs-serverless');
    
    // Load the PDF using pdfjs-serverless (works in Cloudflare Workers)
    const pdf = await getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    }).promise;
    
    console.log('PDF loaded, pages:', pdf.numPages);
    
    let fullText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items into a string
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
      console.log(`Page ${pageNum} text length:`, pageText.length);
      console.log(`Page ${pageNum} preview:`, pageText.substring(0, 200));
    }
    
    console.log('=== FULL TEXT EXTRACTED ===');
    console.log('Total length:', fullText.length);
    console.log('First 500 chars:', fullText.substring(0, 500));
    console.log('Contains "experience"?', fullText.toLowerCase().includes('experience'));
    console.log('Contains "skills"?', fullText.toLowerCase().includes('skills'));
    console.log('Contains "education"?', fullText.toLowerCase().includes('education'));
    
    // Validate extraction
    if (fullText.length < 100) {
      throw new Error('Extracted text too short - PDF may be scanned image');
    }
    
    // Clean the text
    const cleanedText = fullText
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\x20-\x7E\n]/g, '')  // Remove non-printable chars
      .trim();
    
    console.log('Cleaned text length:', cleanedText.length);
    console.log('Cleaned preview:', cleanedText.substring(0, 300));
    
    return cleanedText;
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}

// Utility: Process CSV file
async function processCSV(csvText, fileName) {
  console.log('=== CSV PROCESSING ===');
  console.log('CSV length:', csvText.length);
  
  // Use simple CSV parser (no external dependencies, Worker-compatible)
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Simple CSV parsing (handles quoted fields)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Last value
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.replace(/^"|"$/g, '') || '';
      });
      rows.push(row);
    }
  }
  
  console.log('CSV parsed, rows:', rows.length);
  console.log('Headers:', headers);
  
  let text = `CSV File: ${fileName}\n\n`;
  text += `This dataset contains ${rows.length} records with the following information:\n\n`;
  
  // Add column descriptions
  headers.forEach(header => {
    const values = rows.map(r => r[header]).filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = [...new Set(values)].slice(0, 5);
    
    text += `${header}:\n`;
    if (uniqueValues.length > 0) {
      text += `  Examples: ${uniqueValues.join(', ')}\n`;
    }
    text += `  Total entries: ${values.length}\n\n`;
  });
  
  // Add full data
  text += `\n\nComplete Data:\n\n`;
  rows.forEach((row, idx) => {
    text += `Record ${idx + 1}: `;
    text += headers.map(h => `${h}: ${row[h] || ''}`).join(', ');
    text += '\n';
  });
  
  console.log('CSV converted to text, length:', text.length);
  console.log('Preview:', text.substring(0, 500));
  
  return text;
}

// Utility: Extract text from image using OCR.space API
async function extractTextFromImage(arrayBuffer, mimeType, env) {
  console.log('=== IMAGE OCR START ===');
  console.log('Image size:', arrayBuffer.byteLength);
  console.log('MIME type:', mimeType);
  
  try {
    // Check size limit (OCR.space free tier: 1MB)
    if (arrayBuffer.byteLength > 1024 * 1024) {
      throw new Error('Image too large (max 1MB). Please compress your image.');
    }
    
    // Convert to base64 in chunks to avoid stack overflow
    // Use smaller chunks to prevent call stack issues
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192; // 8KB chunks (safe size for String.fromCharCode)
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      // Convert chunk using Array.from to avoid stack overflow
      const chunkArray = Array.from(chunk);
      binary += String.fromCharCode.apply(null, chunkArray);
    }
    
    const base64Image = btoa(binary);
    const dataUri = `data:${mimeType};base64,${base64Image}`;
    
    console.log('Image converted to base64, length:', base64Image.length);
    
    const formData = new URLSearchParams();
    formData.append('base64Image', dataUri);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    
    const apiKey = env.OCR_SPACE_API_KEY || 'K87899142388957'; // Free demo key
    
    console.log('Calling OCR.space API...');
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OCR API error response:', errorText);
      throw new Error(`OCR API returned ${response.status}`);
    }
    
    const result = await response.json();
    console.log('OCR result:', JSON.stringify(result).substring(0, 500));
    
    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.[0] || 'OCR failed');
    }
    
    const text = result.ParsedResults?.[0]?.ParsedText || '';
    
    console.log('Extracted text length:', text.length);
    console.log('Preview:', text.substring(0, 200));
    
    if (text.trim().length < 5) {
      throw new Error('No readable text found in image');
    }
    
    return text.trim();
    
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error(`Image OCR failed: ${error.message}`);
  }
}

// Utility: Extract text from file (supports TXT, PDF, CSV, and Images)
async function extractTextFromFile(file, filename, env) {
  const extension = filename.split('.').pop().toLowerCase();
  const fileType = file.type;
  
  console.log('=== FILE EXTRACTION ===');
  console.log('Filename:', filename);
  console.log('Extension:', extension);
  console.log('MIME type:', fileType);
  
  if (extension === 'txt' || fileType === 'text/plain') {
    const text = await file.text();
    console.log('TXT file - Text length:', text.length);
    console.log('Text preview:', text.substring(0, 200));
    console.log('Is readable:', isValidText(text));
    
    if (!isValidText(text)) {
      throw new Error('TXT file contains binary data or is not readable');
    }
    
    return cleanText(text);
  } else if (extension === 'pdf' || fileType === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const extractedText = await extractTextFromPDF(arrayBuffer);
    
    // Additional validation after extraction
    console.log('=== TEXT VALIDATION ===');
    console.log('Extracted text starts with:', extractedText.substring(0, 100));
    console.log('Text contains resume keywords?', 
      extractedText.toLowerCase().includes('experience') ||
      extractedText.toLowerCase().includes('education') ||
      extractedText.toLowerCase().includes('skills')
    );
    
    return extractedText;
  } else if (extension === 'csv' || fileType === 'text/csv') {
    const csvText = await file.text();
    return await processCSV(csvText, filename);
  } else if (fileType.startsWith('image/') || /\.(png|jpg|jpeg|heic)$/i.test(filename)) {
    const arrayBuffer = await file.arrayBuffer();
    return await extractTextFromImage(arrayBuffer, fileType, env);
  } else {
    throw new Error(`Unsupported file type: ${extension}. Please upload PDF, TXT, CSV, or image files (PNG, JPG, JPEG, HEIC).`);
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
      'SELECT id, email FROM users WHERE id = ?'
    ).bind(userId).first();
    
    // Use a variable to track the actual user ID (userId parameter is const)
    let actualUserId = userId;
    
    if (!user) {
      // Auto-create user with temporary email
      // Use a unique email format to avoid conflicts
      const tempEmail = `${actualUserId}@temp.local`;
      
      // Check if this email already exists (shouldn't happen, but be safe)
      const existingByEmail = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(tempEmail).first();
      
      if (existingByEmail) {
        // User already exists with this email, use that ID
        actualUserId = existingByEmail.id;
        user = existingByEmail;
      } else {
        // Create new user with unique email
        try {
          await env.DB.prepare(
            'INSERT INTO users (id, email) VALUES (?, ?)'
          ).bind(actualUserId, tempEmail).run();
          user = { id: actualUserId, email: tempEmail };
        } catch (error) {
          // If insert fails (e.g., duplicate ID), try to get existing user
          if (error.message.includes('UNIQUE') || error.message.includes('constraint')) {
            const existing = await env.DB.prepare(
              'SELECT id, email FROM users WHERE id = ?'
            ).bind(actualUserId).first();
            if (existing) {
              user = existing;
              actualUserId = existing.id;
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
    } else {
      // User exists, use their ID
      actualUserId = user.id;
    }
    
    const filename = file.name;
    const fileSize = file.size;
    
    // Extract text from file
    const text = await extractTextFromFile(file, filename, env);
    
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not extract text from file' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // After extracting text, before chunking - extensive logging
    console.log('=== TEXT VALIDATION ===');
    console.log('Extracted text length:', text.length);
    console.log('Extracted text starts with:', text.substring(0, 100));
    console.log('Extracted text ends with:', text.substring(Math.max(0, text.length - 100)));
    console.log('Text contains resume keywords?', {
      experience: text.toLowerCase().includes('experience'),
      education: text.toLowerCase().includes('education'),
      skills: text.toLowerCase().includes('skills'),
      work: text.toLowerCase().includes('work'),
      job: text.toLowerCase().includes('job'),
      resume: text.toLowerCase().includes('resume')
    });
    console.log('Text sample (chars 500-800):', text.substring(500, 800));
    
    // Chunk text
    const chunks = chunkText(text, 1500, 100);
    
    // Log first chunk being created
    console.log('=== CHUNKING RESULT ===');
    console.log('Number of chunks:', chunks.length);
    if (chunks.length > 0) {
      console.log('First chunk length:', chunks[0].length);
      console.log('First chunk (first 200 chars):', chunks[0].substring(0, 200));
      console.log('First chunk (last 200 chars):', chunks[0].substring(Math.max(0, chunks[0].length - 200)));
      if (chunks.length > 1) {
        console.log('Second chunk length:', chunks[1].length);
        console.log('Second chunk (first 200 chars):', chunks[1].substring(0, 200));
      }
    }
    
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
    const filePath = `${actualUserId}/${documentId}/${filename}`;
    
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
    ).bind(documentId, actualUserId, filename, filePath, fileSize).run();
    
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

// API Endpoint: OAuth callback - exchange code for token and get user info
async function handleOAuthCallback(request, env) {
  try {
    const body = await parseJSON(request);
    if (!body || !body.code) {
      return new Response(
        JSON.stringify({ error: 'OAuth code is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = body.redirect_uri || 'http://localhost:5173';

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET secrets.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: body.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange OAuth code for token', details: errorText }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token received from Google' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('User info error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get user info from Google', details: errorText }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const googleUser = await userInfoResponse.json();

    // Step 3: Create or update user in database
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists by email
    const existingUser = await env.DB.prepare(
      'SELECT id, email FROM users WHERE email = ?'
    ).bind(googleUser.email).first();

    let userId;
    if (existingUser) {
      userId = existingUser.id;
      // Update user info if needed
      await env.DB.prepare(
        'UPDATE users SET email = ? WHERE id = ?'
      ).bind(googleUser.email, userId).run();
    } else {
      // Create new user
      userId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO users (id, email) VALUES (?, ?)'
      ).bind(userId, googleUser.email).run();
    }

    // Return user data
    return new Response(
      JSON.stringify({
        user_id: userId,
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        avatar: googleUser.picture || null,
        created_at: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      JSON.stringify({ error: 'OAuth callback failed', details: error.message }),
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
      'SELECT id, filename, upload_date, size_bytes, doc_type, source_url FROM documents WHERE user_id = ? ORDER BY upload_date DESC'
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

// API Endpoint: Add link
async function handleAddLink(request, env) {
  try {
    // Check for API key
    let apiKey = env.HUGGINGFACE;
    if (!apiKey && env['Hugging Face']) {
      apiKey = env['Hugging Face'];
    }
    if (!apiKey || (typeof apiKey === 'string' && apiKey.trim() === '')) {
      return new Response(
        JSON.stringify({ error: 'HuggingFace API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await parseJSON(request);
    const { url: linkUrl, user_id: userId } = body;

    if (!linkUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'URL and user_id are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL
    try {
      new URL(linkUrl);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check document limit
    const docCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM documents WHERE user_id = ?'
    ).bind(userId).first();
    
    if (docCount && docCount.count >= 50) {
      return new Response(
        JSON.stringify({ error: 'Document limit reached (50 documents per user)' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== LINK PROCESSING ===');
    console.log('Fetching URL:', linkUrl);

    // Fetch the webpage
    const response = await fetch(linkUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DocumentBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    console.log('HTML fetched, length:', html.length);

    // Extract text from HTML (basic version)
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('Extracted text length:', text.length);

    // Get title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(linkUrl).hostname;

    if (text.length < 100) {
      return new Response(
        JSON.stringify({ error: 'Could not extract enough text from URL. The page may require JavaScript or be behind authentication.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Chunk text
    const chunks = chunkText(text, 1500, 100);
    
    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text chunks created from URL' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enforce maximum chunk limit
    const MAX_CHUNKS = 50;
    if (chunks.length > MAX_CHUNKS) {
      return new Response(
        JSON.stringify({ 
          error: 'Content too large', 
          message: `This URL would create ${chunks.length} chunks. Maximum is ${MAX_CHUNKS}.`
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate embeddings in batches
    const BATCH_SIZE = 10;
    const embeddings = [];
    let lastError = null;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      try {
        const batchEmbeddings = await getEmbeddings(batch, apiKey);
        for (let j = 0; j < batch.length; j++) {
          embeddings.push({
            chunk: batch[j],
            embedding: JSON.stringify(batchEmbeddings[j]),
            index: i + j,
          });
        }
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error generating embeddings for batch starting at ${i}:`, error);
        lastError = error;
      }
    }

    if (embeddings.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate embeddings',
          details: lastError ? lastError.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store document
    const documentId = generateId();
    await env.DB.prepare(
      'INSERT INTO documents (id, user_id, filename, file_path, upload_date, size_bytes, doc_type, source_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      documentId,
      userId,
      title,
      linkUrl,
      Math.floor(Date.now() / 1000),
      text.length,
      'link',
      linkUrl
    ).run();

    // Store embeddings in batch
    const embeddingStatements = embeddings.map(e => 
      env.DB.prepare(
        'INSERT INTO embeddings (id, document_id, chunk_text, embedding, chunk_index) VALUES (?, ?, ?, ?, ?)'
      ).bind(generateId(), documentId, e.chunk, e.embedding, e.index)
    );

    await env.DB.batch(embeddingStatements);

    return new Response(
      JSON.stringify({ 
        success: true, 
        document_id: documentId,
        filename: title,
        chunks: chunks.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Link processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process link' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// API Endpoint: Add text snippet
async function handleAddText(request, env) {
  try {
    // Check for API key
    let apiKey = env.HUGGINGFACE;
    if (!apiKey && env['Hugging Face']) {
      apiKey = env['Hugging Face'];
    }
    if (!apiKey || (typeof apiKey === 'string' && apiKey.trim() === '')) {
      return new Response(
        JSON.stringify({ error: 'HuggingFace API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await parseJSON(request);
    const { title, content, user_id: userId } = body;

    if (!content || !userId) {
      return new Response(
        JSON.stringify({ error: 'Content and user_id are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check document limit
    const docCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM documents WHERE user_id = ?'
    ).bind(userId).first();
    
    if (docCount && docCount.count >= 50) {
      return new Response(
        JSON.stringify({ error: 'Document limit reached (50 documents per user)' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== TEXT SNIPPET PROCESSING ===');
    console.log('Title:', title || 'Untitled note');
    console.log('Content length:', content.length);

    // Chunk text
    const chunks = chunkText(content, 1500, 100);
    
    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text chunks created' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enforce maximum chunk limit
    const MAX_CHUNKS = 50;
    if (chunks.length > MAX_CHUNKS) {
      return new Response(
        JSON.stringify({ 
          error: 'Text too large', 
          message: `This text would create ${chunks.length} chunks. Maximum is ${MAX_CHUNKS}.`
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate embeddings in batches
    const BATCH_SIZE = 10;
    const embeddings = [];
    let lastError = null;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      try {
        const batchEmbeddings = await getEmbeddings(batch, apiKey);
        for (let j = 0; j < batch.length; j++) {
          embeddings.push({
            chunk: batch[j],
            embedding: JSON.stringify(batchEmbeddings[j]),
            index: i + j,
          });
        }
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error generating embeddings for batch starting at ${i}:`, error);
        lastError = error;
      }
    }

    if (embeddings.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate embeddings',
          details: lastError ? lastError.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store document
    const documentId = generateId();
    const docTitle = title || 'Untitled note';
    await env.DB.prepare(
      'INSERT INTO documents (id, user_id, filename, file_path, upload_date, size_bytes, doc_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      documentId,
      userId,
      docTitle,
      'text-snippet',
      Math.floor(Date.now() / 1000),
      content.length,
      'text'
    ).run();

    // Store embeddings in batch
    const embeddingStatements = embeddings.map(e => 
      env.DB.prepare(
        'INSERT INTO embeddings (id, document_id, chunk_text, embedding, chunk_index) VALUES (?, ?, ?, ?, ?)'
      ).bind(generateId(), documentId, e.chunk, e.embedding, e.index)
    );

    await env.DB.batch(embeddingStatements);

    return new Response(
      JSON.stringify({ 
        success: true, 
        document_id: documentId,
        filename: docTitle,
        chunks: chunks.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Text save error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to save text' }),
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
      } else if (path === '/api/auth/oauth/callback' && request.method === 'POST') {
        response = await handleOAuthCallback(request, env);
      } else if (path === '/api/upload' && request.method === 'POST') {
        response = await handleUpload(request, env);
      } else if (path === '/api/chat' && request.method === 'POST') {
        response = await handleChat(request, env);
      } else if (path === '/api/documents' && request.method === 'GET') {
        response = await handleGetDocuments(request, env);
      } else if (path === '/api/documents/link' && request.method === 'POST') {
        response = await handleAddLink(request, env);
      } else if (path === '/api/documents/text' && request.method === 'POST') {
        response = await handleAddText(request, env);
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
      } else if (path === '/' && request.method === 'GET' && !env.ASSETS) {
        // Root endpoint - return API information (only if not serving static files)
        response = new Response(
          JSON.stringify({
            service: 'Document Q&A API',
            version: '1.0.0',
            endpoints: {
              'POST /api/auth/register': 'Register a new user',
              'POST /api/upload': 'Upload a document (PDF/TXT)',
              'POST /api/documents/link': 'Add a link (URL)',
              'POST /api/documents/text': 'Add a text snippet',
              'POST /api/chat': 'Send a chat message',
              'GET /api/documents?user_id=X': 'List documents for a user',
              'DELETE /api/documents/:id': 'Delete a document',
              'GET /api/debug/secret': 'Debug: Check API key (dev only)',
              'GET /api/debug/bindings': 'Debug: Check bindings (dev only)',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else if (!path.startsWith('/api/')) {
        // Not an API route - serve static files
        // Check if ASSETS binding exists (for static file serving)
        if (env.ASSETS) {
          try {
            // Try to fetch the requested file
            const assetResponse = await env.ASSETS.fetch(request);
            
            // If found, return it
            if (assetResponse.status === 200) {
              return assetResponse;
            }
            
            // If not found and it's a route (no file extension), serve index.html for SPA
            if (!path.includes('.') || path.endsWith('/')) {
              const indexRequest = new Request(new URL('/index.html', request.url), request);
              const indexResponse = await env.ASSETS.fetch(indexRequest);
              if (indexResponse.status === 200) {
                return indexResponse;
              }
            }
            
            // Otherwise return the 404
            return assetResponse;
          } catch (error) {
            console.error('Error serving static file:', error);
            // Fall through to error handling
          }
        }
        
        // If ASSETS binding doesn't exist, we're using legacy assets format
        // With legacy assets and not_found_handling = "single-page-application",
        // the assets system should serve index.html automatically for non-matching routes
        // However, the Worker is still called, so we need to not interfere
        // The best approach: redirect to index.html for non-API routes
        // This ensures the SPA routing works correctly
        return Response.redirect(new URL('/index.html', request.url), 302);
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

