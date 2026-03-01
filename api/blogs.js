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
    console.warn("WARNING: Supabase URL or Key is missing. Blog features will not work.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

// GET / - List all blogs
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Error fetching blogs:", err);
        res.status(500).json({ message: "Failed to fetch blogs", error: err.message });
    }
});

// GET /slug/:slug
router.get('/slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(404).json({ message: "Blog not found", error: err.message });
    }
});

// GET /:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch blog", error: err.message });
    }
});

// POST /
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, content, meta_title, meta_description, slug: providedSlug } = req.body;
        const file = req.file;

        if (!title || !content) {
            return res.status(400).json({ message: "Title and content are required" });
        }

        let imageUrl = null;

        if (file) {
            const compressedImageBuffer = await sharp(file.buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();

            const filename = `blog_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filename, compressedImageBuffer, { contentType: 'image/jpeg' });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('images')
                .getPublicUrl(filename);

            imageUrl = publicUrlData.publicUrl;
        }

        const slug = providedSlug && providedSlug.trim() !== '' ? providedSlug : createSlug(title);

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

        if (error) throw error;
        res.status(201).json({ message: "Blog created successfully", blog: data[0] });

    } catch (err) {
        console.error("Error creating blog:", err);
        res.status(500).json({ message: "Failed to create blog", error: err.message });
    }
});

// PUT /:id
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, meta_title, meta_description, slug, image_url: existingImageUrl } = req.body;
        const file = req.file;

        let imageUrl = existingImageUrl;

        if (file) {
            const compressedImageBuffer = await sharp(file.buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();

            const filename = `blog_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filename, compressedImageBuffer, { contentType: 'image/jpeg' });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('images')
                .getPublicUrl(filename);

            imageUrl = publicUrlData.publicUrl;
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

        if (error) throw error;
        res.json({ message: "Blog updated successfully", blog: data[0] });

    } catch (err) {
        console.error("Error updating blog:", err);
        res.status(500).json({ message: "Failed to update blog", error: err.message });
    }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('blogs')
            .delete()
            .eq('id', id);

        if (error) throw error;
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
