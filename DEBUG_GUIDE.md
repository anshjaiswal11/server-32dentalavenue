# Blog API Debug Guide

## Quick Debug Steps

### 1. Check Supabase Connection Status
Run this command to test if Supabase is properly configured:

```bash
curl -X GET "https://your-domain.vercel.app/api/blogs/debug/status"
```

Or locally:
```bash
curl -X GET "http://localhost:3000/api/blogs/debug/status"
```

**Expected Response (Success):**
```json
{
  "message": "Supabase configured and connected successfully",
  "debug": {
    "timestamp": "2026-03-02T...",
    "supabaseUrlPresent": true,
    "supabaseKeyPresent": true,
    "supabaseClientInitialized": true,
    "supabaseUrl": "https://xxxxx.supabase.co...",
    "supabaseKeyPrefix": "eyJhbGciOiJIUzI1NiIs..."
  },
  "testResult": {
    "success": true,
    "dataFetched": 5
  }
}
```

**If 401 Error:**
```json
{
  "message": "Supabase connection test failed",
  "error": {
    "status": 401,
    "message": "Unauthorized",
    "hint": "Check that SUPABASE_KEY has correct permissions"
  }
}
```

### 2. Check Server Logs

After deploying to Vercel, check the deployment logs for output like:
- `[DEBUG] Supabase Status:` - Shows if env vars are loaded
- `[POST /blogs] Request received` - Shows the blog creation attempt
- `[ERROR]` - Shows the exact error with status code and details

### 3. Common 401 Solutions

**Option A: Use Service Role Key (Recommended for Server)**
1. Go to Supabase Dashboard → Project Settings → API
2. Copy the **Service Role Key** (not the Anon key)
3. Set `SUPABASE_KEY` to this Service Role Key on Vercel

**Option B: Check RLS Policies**
1. Go to Supabase Dashboard → Authentication → Policies
2. Check that your `blogs` table RLS policies allow INSERT
3. Ensure the database user has proper permissions

**Option C: Verify Environment Variables**
1. On Vercel Dashboard → Project Settings → Environment Variables
2. Confirm both `SUPABASE_URL` and `SUPABASE_KEY` are set
3. Redeploy after updating

### 4. Test Blog Creation with Curl

```bash
curl -X POST "http://localhost:3000/api/blogs" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Blog",
    "content": "<p>Test content</p>",
    "meta_title": "Test",
    "meta_description": "Test description"
  }'
```

### 5. What the New Logging Shows

Each request now logs:
- ✅ Supabase client initialization status
- ✅ Each step of image upload
- ✅ Exact database error with status code
- ✅ Full error object with details and hints

**Check your Vercel logs for lines starting with:**
- `[DEBUG]` - Debug info
- `[POST /blogs]` - Blog creation steps
- `[ERROR]` - Errors with full details

---

## Error Codes Reference

| Status | Meaning | Solution |
|--------|---------|----------|
| **401** | Unauthorized - Wrong API key | Use Service Role Key |
| **403** | Forbidden - RLS policy blocked | Check table policies |
| **400** | Bad Request - Missing fields | Check request body |
| **503** | Service Unavailable - Env vars missing | Set SUPABASE_URL and SUPABASE_KEY |
| **500** | Server Error | Check logs for details |
