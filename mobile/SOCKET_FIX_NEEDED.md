# 🔧 Socket.io Authentication Issue - Needs Backend Fix

## Current Status
❌ Socket.io DISABLED due to infinite reconnect loop
✅ Using POLLING (2 seconds) as reliable fallback

## The Problem

Socket connects successfully but backend immediately disconnects with:
```
io server disconnect
```

This means backend's JWT authentication middleware is rejecting the token.

## Root Cause

Backend `socket.js` authentication middleware expects specific JWT structure but the token from mobile app doesn't match.

**What's happening:**
1. Mobile sends JWT token
2. Backend decodes token successfully
3. Backend tries to extract `userId` from token
4. `userId` is undefined or wrong format
5. Backend forcefully disconnects socket
6. Mobile auto-reconnects (infinite loop)

## Backend Fix Required

### File: `party-admin-backend/src/config/socket.js`

**Current code (line ~30):**
```javascript
const userId = socket.user.userId || socket.user.id || socket.user.sub || socket.user._id;

if (!userId) {
    console.error('[Socket] No user ID found in token. Token payload:', JSON.stringify(socket.user));
    socket.disconnect();
    return;
}
```

**Issue:** The JWT token structure from mobile doesn't have these fields in the expected format.

### Solution Options

#### Option 1: Log the actual token structure
Add this BEFORE the userId extraction:
```javascript
console.log('[Socket] FULL TOKEN PAYLOAD:', JSON.stringify(socket.user, null, 2));
```

Then check backend logs to see what fields actually exist.

#### Option 2: Don't disconnect on missing userId
```javascript
const userId = socket.user.userId || socket.user.id || socket.user.sub || socket.user._id || socket.user.hostId;

if (!userId) {
    console.warn('[Socket] No user ID found, using socket.id as fallback');
    // Don't disconnect, use socket.id as identifier
    socket.join(socket.id);
} else {
    socket.join(userId.toString());
}
```

#### Option 3: Check JWT generation
Verify that when host logs in, the JWT includes proper fields:

**File:** `party-admin-backend/src/controllers/auth.controller.js`

```javascript
const accessToken = jwt.sign(
    { 
        userId: user._id,  // ✅ Must be present
        role: user.role, 
        hostId: user.hostId || null 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);
```

## Current Workaround

**Mobile app is using POLLING instead of Socket.io:**
- Polls every 2 seconds
- Checks host status from API
- Auto-redirects when status changes
- Works reliably but not "real-time"

**Performance:**
- Polling: 2-4 second delay
- Socket (when working): < 1 second delay

## How to Re-enable Socket

Once backend is fixed:

1. **Test backend first:**
```bash
cd party-admin-backend
node test-socket.js
```

Should show:
```
✅ Connected successfully!
Socket ID: abc123
Listening for host:status:updated events...
```

2. **Re-enable in mobile:**

In `mobile/src/app/(host)/under-review.tsx`, replace the disabled socket code with the original implementation.

3. **Test end-to-end:**
- Host login → under-review screen
- Admin approves
- Host should redirect in < 1 second

## Testing Checklist

- [ ] Backend logs show token payload structure
- [ ] Backend extracts userId successfully
- [ ] Socket stays connected (no disconnect loop)
- [ ] Admin approval emits event
- [ ] Host receives event
- [ ] Host auto-redirects to dashboard

## Backend Logs to Check

**Good (working):**
```
[Socket] ✅ Token decoded: { userId: '123', role: 'HOST', hasUserId: true }
[Socket] ✅ User connected: 123 (HOST)
[Socket] User 123 joined room: 123
```

**Bad (current issue):**
```
[Socket] ✅ Token decoded: { ... }
[Socket] No user ID found in token
[Socket disconnects]
```

## Priority

🔴 HIGH - Socket provides much better UX than polling

## Estimated Fix Time

⏱️ 15-30 minutes (once backend logs are checked)

## Contact

If you need help fixing this, share:
1. Backend logs when socket connects
2. Full JWT token payload structure
3. Auth controller JWT generation code

---

**Status:** Waiting for backend fix
**Workaround:** Polling (2s interval) ✅ Working
**Last Updated:** 2026-04-13
