# Supabase Setup for iVisit Document Generator

## 🚀 Quick Setup

### 1. Run the Migration SQL

**Option A: Full Version (with vector search support)**
```bash
# Copy and paste this SQL into your Supabase SQL Editor:
cat supabase-migration.sql
```

**Option B: Simple Version (basic text search only)**
```bash
# Copy and paste this SQL into your Supabase SQL Editor:
cat supabase-migration-simple.sql
```

### 2. Steps to Run Migration

1. **Open your Supabase project dashboard**
2. **Navigate to SQL Editor** (in the left sidebar)
3. **Copy the entire contents** of either:
   - `supabase-migration.sql` (recommended, includes vector support)
   - `supabase-migration-simple.sql` (lightweight version)
4. **Paste and run** the SQL
5. **Verify setup** with: `node setup-supabase.js test`

### 3. Test Your Setup

```bash
# Test the connection and table
node setup-supabase.js

# If table exists, test functionality
node setup-supabase.js test

# Show available migration files
node setup-supabase.js show
```

### 4. Start Using the System

```bash
# Index your codebase into Supabase
node index.js "Index all files into Supabase"

# Generate documents with memory
node index.js "Generate a business proposal"
node index.js "Generate privacy policy"
```

## 📊 Migration Files

### `supabase-migration.sql` (Full Version)
- ✅ Vector embeddings support (pgvector)
- ✅ Full-text search
- ✅ Similarity search functions
- ✅ Performance indexes
- ✅ Recent chunks view
- ✅ Automated timestamps

### `supabase-migration-simple.sql` (Basic Version)
- ✅ Full-text search
- ✅ Performance indexes
- ✅ Recent chunks view
- ✅ Automated timestamps
- ❌ No vector support

## 🔧 Environment Variables

Make sure your `.env` file has:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Frontend keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
```

## 🧪 Verification Commands

```bash
# Test connection
node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('code_chunks').select('count').then(r => console.log('✅ Connected' , !r.error ? '✅' : '❌', r.error?.message));
"

# Check table exists
node setup-supabase.js

# Test full functionality
node setup-supabase.js test
```

## 🚨 Troubleshooting

### "Table not found" Error
- Run the migration SQL first
- Check you're using the correct Supabase project

### "Permission denied" Error
- Use the SERVICE_ROLE_KEY (not anon key)
- Ensure the key has proper permissions

### Connection Issues
- Verify SUPABASE_URL is correct
- Check your service role key is valid
- Ensure your Supabase project is active

## 📈 Features After Setup

Once set up, you'll have:

1. **Smart Document Generation** - Context-aware from your codebase
2. **Incremental Updates** - Only processes changed files
3. **Full-Text Search** - Find relevant code chunks instantly
4. **Performance Optimization** - Indexed and cached queries
5. **Memory Layer** - Persistent storage for faster generation

## 🎯 Next Steps

After setup:

1. **Index your codebase**: `node index.js "Index all files into Supabase"`
2. **Generate first document**: `node index.js "Generate a business proposal"`
3. **Explore advanced features**: Vector search, semantic similarity, etc.

---

**Need help?** Check the main README.md or run `node setup-supabase.js` for guided setup.
