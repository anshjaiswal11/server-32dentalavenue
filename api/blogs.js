const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const router = express.Router();

// Enable CORS
app.use(cors());

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("WARNING: SUPABASE_URL or SUPABASE_KEY is missing. Blog features will not work.");
}

// Only create client when config is present to avoid runtime fetch failures
let supabase = null;
if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
    } catch (err) {
        console.error('Failed to initialise Supabase client', err && err.message ? err.message : err);
        supabase = null;
    }
}

function ensureSupabaseConfigured(res) {
    if (!supabase) {
        res.status(503).json({ message: 'Supabase not configured', error: 'SUPABASE_URL and/or SUPABASE_KEY are missing or invalid' });
        return false;
    }
    return true;
}

// Unified Supabase error handler to return proper HTTP statuses and improved logs
function handleSupabaseError(res, error, defaultMsg = 'Supabase error') {
    const status = (error && (error.status || error.statusCode)) || 500;
    const message = (error && (error.message || error.msg)) || (typeof error === 'string' ? error : defaultMsg);
    
    console.error(`[ERROR] ${defaultMsg}`, {
        httpStatus: status,
        errorMessage: message,
        errorCode: error && error.code,
        errorDetails: error && error.details,
        errorHint: error && error.hint,
        fullError: error
    });

    if (status === 401) {
        return res.status(401).json({ 
            message: 'Supabase authentication failed (401)', 
            error: message,
            hint: 'Check that SUPABASE_KEY has correct permissions, or try using a service role key'
        });
    }
    return res.status(status).json({ message: defaultMsg, error: message });
}

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Helper to create slug
const createSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
};

// --- Define Routes on Router ---

// DEBUG ENDPOINT: Check Supabase status and connection
router.get('/debug/status', async (req, res) => {
    const debug = {
        timestamp: new Date().toISOString(),
        supabaseUrlPresent: !!process.env.SUPABASE_URL,
        supabaseKeyPresent: !!process.env.SUPABASE_KEY,
        supabaseClientInitialized: !!supabase,
        supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'MISSING',
        supabaseKeyPrefix: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.substring(0, 20) + '...' : 'MISSING',
    };

    console.log('[DEBUG] Supabase Status:', JSON.stringify(debug, null, 2));

    if (!supabase) {
        return res.status(503).json({
            message: 'Supabase NOT configured',
            debug,
            error: 'SUPABASE_URL and/or SUPABASE_KEY missing'
        });
    }

    try {
        // Try to fetch a single blog to test connection and auth
        console.log('[DEBUG] Testing Supabase connection with a SELECT query...');
        const { data, error } = await supabase
            .from('blogs')
            .select('id, title')
            .limit(1);

        if (error) {
            console.error('[DEBUG] Supabase connection test FAILED:', error);
            return res.status(error.status || 500).json({
                message: 'Supabase connection test failed',
                debug,
                error: {
                    status: error.status || error.statusCode,
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                }
            });
        }

        console.log('[DEBUG] Supabase connection test SUCCESS. Returned', data ? data.length : 0, 'records');
        return res.status(200).json({
            message: 'Supabase configured and connected successfully',
            debug,
            testResult: {
                success: true,
                dataFetched: data ? data.length : 0
            }
        });
    } catch (err) {
        console.error('[DEBUG] Exception during connection test:', err);
        return res.status(500).json({
            message: 'Exception during Supabase connection test',
            debug,
            error: {
                message: err.message,
                stack: err.stack
            }
        });
    }
});

// GET / - List all blogs
router.get('/', async (req, res) => {
    if (!ensureSupabaseConfigured(res)) return;
    try {
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return handleSupabaseError(res, error, 'Failed to fetch blogs');
        res.json(data);
    } catch (err) {
        console.error("Error fetching blogs:", err);
        const hint = err && err.message && err.message.includes('fetch failed') ? ' (network/fetch failure - check SUPABASE_URL and connectivity)' : '';
        res.status(500).json({ message: "Failed to fetch blogs", error: (err && err.message) ? err.message + hint : 'Unknown error' });
    }
});

// GET /test - Return random test JSON for Postman/dev troubleshooting
router.get('/test', (req, res) => {
    const make = (i) => {
        const id = Math.floor(Math.random() * 100000) + i;
        const title = `Sample Blog ${id}`;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const now = new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30));
        return {
            id,
            title,
            slug,
            excerpt: `This is an automatically generated excerpt for ${title}.`,
            content: `<p>${title} - generated content for testing purposes.</p>`,
            image_url: `https://picsum.photos/seed/${id}/800/400`,
            meta_title: `${title} - 32Dental Avenue`,
            meta_description: `Meta for ${title}`,
            created_at: now.toISOString()
        };
    };

    const count = Number(req.query.count) || 3;
    const items = Array.from({ length: Math.min(10, Math.max(1, count)) }, (_, i) => make(i));
    res.json(items);
});

// GET /slug/:slug
router.get('/slug/:slug', async (req, res) => {
    if (!ensureSupabaseConfigured(res)) return;
    try {
        const { slug } = req.params;
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) return handleSupabaseError(res, error, 'Blog not found');
        res.json(data);
    } catch (err) {
        res.status(404).json({ message: "Blog not found", error: err.message });
    }
});

// GET /:id
router.get('/:id', async (req, res) => {
    if (!ensureSupabaseConfigured(res)) return;
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return handleSupabaseError(res, error, 'Failed to fetch blog');
        res.json(data);
    } catch (err) {
        const hint = err && err.message && err.message.includes('fetch failed') ? ' (fetch failed - possible network or missing SUPABASE config)' : '';
        res.status(500).json({ message: "Failed to fetch blog", error: (err && err.message) ? err.message + hint : 'Unknown error' });
    }
});

// POST /
router.post('/', upload.single('image'), async (req, res) => {
    console.log('[POST /blogs] Request received', {
        hasTitle: !!req.body.title,
        hasContent: !!req.body.content,
        hasFile: !!req.file,
        supabaseClientExists: !!supabase
    });

    if (!ensureSupabaseConfigured(res)) {
        console.error('[POST /blogs] Supabase not configured');
        return;
    }

    try {
        const { title, content, meta_title, meta_description, slug: providedSlug } = req.body;
        const file = req.file;

        console.log('[POST /blogs] Validation check:', { title, content });

        if (!title || !content) {
            console.warn('[POST /blogs] Missing required fields');
            return res.status(400).json({ message: "Title and content are required" });
        }

        let imageUrl = null;

        if (file) {
            console.log('[POST /blogs] Processing image file...');
            try {
                const compressedImageBuffer = await sharp(file.buffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toBuffer();

                const filename = `blog_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                console.log('[POST /blogs] Uploading image to Supabase storage:', filename);

                const { error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(filename, compressedImageBuffer, { contentType: 'image/jpeg' });

                if (uploadError) {
                    console.error('[POST /blogs] Supabase storage upload failed (non-fatal):', {
                        status: uploadError.status,
                        statusCode: uploadError.statusCode,
                        message: uploadError.message,
                        code: uploadError.code,
                        details: uploadError.details,
                        hint: uploadError.hint
                    });
                } else {
                    console.log('[POST /blogs] Image uploaded successfully, getting public URL...');
                    const { data: publicUrlData } = await supabase.storage
                        .from('images')
                        .getPublicUrl(filename);
                    imageUrl = publicUrlData && publicUrlData.publicUrl ? publicUrlData.publicUrl : null;
                    console.log('[POST /blogs] Public URL obtained:', imageUrl);
                }
            } catch (uploadErr) {
                console.error('[POST /blogs] Image processing/upload error (non-fatal):', {
                    message: uploadErr.message,
                    stack: uploadErr.stack
                });
                // don't throw; allow blog creation without image
            }
        }

        const slug = providedSlug && providedSlug.trim() !== '' ? providedSlug : createSlug(title);

        console.log('[POST /blogs] About to insert blog record into database:', {
            title,
            slug,
            hasImageUrl: !!imageUrl
        });

        const { data, error } = await supabase
            .from('blogs')
            .insert([{
                title,
                content,
                image_url: imageUrl,
                slug,
                meta_title,
                meta_description,
                created_at: new Date()
            }])
            .select();

        if (error) {
            console.error('[POST /blogs] Database insert FAILED with status', error.status || error.statusCode, ':', {
                status: error.status || error.statusCode,
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return handleSupabaseError(res, error, 'Failed to create blog');
        }

        console.log('[POST /blogs] Blog created successfully:', data[0].id);
        res.status(201).json({ message: "Blog created successfully", blog: data[0] });

    } catch (err) {
        console.error("[POST /blogs] Unexpected error:", {
            message: err.message,
            stack: err.stack,
            name: err.name
        });
        res.status(500).json({ message: "Failed to create blog", error: err.message });
    }
});

// PUT /:id
router.put('/:id', upload.single('image'), async (req, res) => {
    if (!ensureSupabaseConfigured(res)) return;
    try {
        const { id } = req.params;
        const { title, content, meta_title, meta_description, slug, image_url: existingImageUrl } = req.body;
        const file = req.file;

        let imageUrl = existingImageUrl;

        if (file) {
            try {
                const compressedImageBuffer = await sharp(file.buffer)
                    .resize({ width: 1200, withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toBuffer();

                const filename = `blog_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

                const { error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(filename, compressedImageBuffer, { contentType: 'image/jpeg' });

                        if (uploadError) {
                            console.error('Supabase storage upload failed during update (non-fatal), continuing without updating image:', uploadError);
                        } else {
                    const { data: publicUrlData } = await supabase.storage
                        .from('images')
                        .getPublicUrl(filename);
                    imageUrl = publicUrlData && publicUrlData.publicUrl ? publicUrlData.publicUrl : imageUrl;
                }
            } catch (uploadErr) {
                console.error('Image processing/upload error during update (non-fatal):', uploadErr && (uploadErr.stack || uploadErr.message || uploadErr));
            }
        }

        const updateData = {
            title,
            content,
            slug: slug || createSlug(title),
            meta_title,
            meta_description,
        };
        if (imageUrl) updateData.image_url = imageUrl;

        const { data, error } = await supabase
            .from('blogs')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) return handleSupabaseError(res, error, 'Failed to update blog');
        res.json({ message: "Blog updated successfully", blog: data[0] });

    } catch (err) {
        console.error("Error updating blog:", err);
        res.status(500).json({ message: "Failed to update blog", error: err.message });
    }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
    if (!ensureSupabaseConfigured(res)) return;
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('blogs')
            .delete()
            .eq('id', id);

        if (error) return handleSupabaseError(res, error, 'Failed to delete blog');
        res.json({ message: "Blog deleted successfully" });
    } catch (err) {
        console.error("Error deleting blog:", err);
        res.status(500).json({ message: "Failed to delete blog", error: err.message });
    }
});

// --- Mount Router ---

// Robust Middleware to handle Vercel's full path vs Local's stripped path
app.use((req, res, next) => {
    // If the request comes from Vercel, it might still have the /api/blogs prefix.
    // We strip it so the router can match against relative paths (e.g., / or /slug/xyz).
    if (req.url.startsWith('/api/blogs')) {
        req.url = req.url.replace('/api/blogs', '') || '/';
    }
    next();
});

// Now, we can just mount the router at root, because req.url is normalized.
app.use('/', router);

module.exports = app;
