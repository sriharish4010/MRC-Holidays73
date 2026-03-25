# Backend Server Files - Usage Guide

## ⭐ Recommended: Use `supabase-server.js`

**Status**: ✅ Production Ready | Clean Code | No Linting Errors

- Modern ES6 modules
- Supabase PostgreSQL integration
- Real-time WebSocket support
- Redis caching configured
- All linting errors fixed
- Ready for deployment

**Start With:**
```bash
npm run server:dev
```

---

## 📦 Legacy: `server.js` (Deprecated)

**Status**: ⚠️ Legacy | MySQL Backend | Many Linting Errors

This file uses:
- MySQL database connection
- Old CommonJS syntax
- Has 50+ linting warnings
- No longer maintained

**Recommendation**: Use `supabase-server.js` instead

If you still need MySQL:
- Fix linting errors with ESLint auto-fix: `npm run lint`
- Or manually update to ES6 modules like supabase-server.js

---

## 🔧 Middleware Files

- ✅ `middleware_auth.js` - Fixed (JWT authentication)
- ✅ `supabase-client.js` - Clean (JavaScript)
- ✅ `supabase-server.js` - Clean (JavaScript)

---

## 📝 Database Files

- ✅ `supabase-schema.sql` - PostgreSQL (Recommended)
- ⚠️ `database_schema.sql` - MySQL (Legacy)

---

## 🚀 Complete Setup

**Use These Files:**

1. **Backend**: `supabase-server.js` ✅
2. **Client**: `supabase-client.js` ✅
3. **Database**: `supabase-schema.sql` ✅
4. **Auth**: `middleware_auth.js` ✅

---

## ✨ Summary

| File | Status | Use? |
|------|--------|------|
| supabase-server.js | ✅ Clean | YES |
| supabase-client.js | ✅ Clean | YES |
| middleware_auth.js | ✅ Fixed | YES |
| supabase-schema.sql | ✅ Clean | YES |
| server.js | ⚠️ Deprecated | NO |
| database_schema.sql | ⚠️ Legacy | NO |

---

**Decision**: The placement-level system uses the Supabase edition (Files 1-4). Files 5-6 are from the original MySQL version and can be removed if you won't use them.
