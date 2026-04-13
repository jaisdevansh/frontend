# 🔍 Socket Connection Debug Guide

## Issue: "io server disconnect"

This means the backend is forcefully disconnecting the socket, usually due to authentication issues.

## Debug Steps

### 1. Check Frontend Logs

When host opens under-review screen, you should see:
```
[Socket] Token found, length: XXX
[Socket] Connecting to: http://your-api-url
[UnderReview] Setting up socket connection...
[Socket] ✅ Connected successfully, ID: abc123
[UnderReview] Socket connected: true
[UnderReview] Socket ID: abc123
[UnderReview] ✅ Socket listener registered
```

### 2. Check Backend Logs

When socket connects, backend should show:
```
[Socket] User authenticated: { id: '123', role: 'HOST' }
[Socket] User connected: 123 (HOST)
[Socket] User 123 joined room: 123
```

### 3. When Admin Approves

Backend should show:
```
[Admin] Emitting APPROVAL to room: 123
[Admin] APPROVAL - Sockets in room 123: 1
[Admin] ✅ APPROVAL event sent to 1 socket(s)
```

Frontend should show:
```
[UnderReview] 🔥 Real-time status update received: { hostStatus: 'ACTIVE' }
```

## Common Issues & Fixes

### Issue 1: "No token found"
**Symptom**: `[Socket] No token found, connection will fail`

**Fix**: Token not in AsyncStorage
```bash
# Check if user is logged in
# Token should be in AsyncStorage under 'auth' key
```

### Issue 2: "io server disconnect"
**Symptom**: Socket connects then immediately disconnects

**Possible Causes**:
1. JWT token invalid or expired
2. JWT_SECRET mismatch between frontend and backend
3. Token doesn't have required fields (id, role)

**Fix**:
```javascript
// Backend: Check JWT decode
// Should have: { id: '123', role: 'HOST' }

// Frontend: Check token format
const auth = await AsyncStorage.getItem('auth');
console.log(JSON.parse(auth));
// Should have: { token: 'jwt...', role: 'host' }
```

### Issue 3: "No sockets found in room"
**Symptom**: `[Admin] ⚠️ No sockets found in room 123`

**Possible Causes**:
1. Host not on under-review screen
2. Socket disconnected before admin approved
3. Room ID mismatch

**Fix**:
- Ensure host is on under-review screen
- Check backend logs for room join confirmation
- Verify host ID matches between JWT and database

### Issue 4: Event not received on frontend
**Symptom**: Backend emits but frontend doesn't receive

**Fix**:
```javascript
// Check event name matches exactly
Backend: io.to(room).emit('host:status:updated', data)
Frontend: socket.on('host:status:updated', callback)

// Check socket is still connected
console.log('[Socket] Connected:', socket.connected);
```

## Testing Socket Connection

### Test 1: Manual Socket Test
```javascript
// In under-review screen, add temporary test:
socket.emit('test', { message: 'hello' });

// In backend socket.js, add:
socket.on('test', (data) => {
  console.log('[Socket] Test received:', data);
  socket.emit('test_response', { message: 'received' });
});

// In frontend:
socket.on('test_response', (data) => {
  console.log('[Socket] Test response:', data);
});
```

### Test 2: Check Room Membership
```javascript
// Backend: Log all rooms for a socket
console.log('[Socket] Rooms:', Array.from(socket.rooms));
// Should include: [socketId, userId]
```

### Test 3: Broadcast Test
```javascript
// Backend: Broadcast to all connected sockets
io.emit('global_test', { message: 'hello all' });

// Frontend: Listen
socket.on('global_test', (data) => {
  console.log('[Socket] Global test:', data);
});
```

## Quick Fixes

### Fix 1: Force Reconnect
```javascript
// In socketClient.ts
if (reason === 'io server disconnect') {
  socket?.connect(); // Already implemented
}
```

### Fix 2: Refresh Token
```javascript
// If token expired, refresh and reconnect
const newToken = await refreshAuthToken();
socket.auth = { token: newToken };
socket.connect();
```

### Fix 3: Fallback to Polling
```javascript
// Already implemented in under-review.tsx
// Polls every 3 seconds as backup
```

## Expected Flow

1. **Host Login** → Token saved to AsyncStorage
2. **Navigate to under-review** → Socket connects with token
3. **Backend authenticates** → Socket joins room with host ID
4. **Admin approves** → Backend emits to host's room
5. **Frontend receives** → Refetch profile, navigate to dashboard

## Monitoring

### Enable Debug Mode
```javascript
// In socketClient.ts
const socket = io(API_BASE_URL, {
  // ... other options
  debug: true, // Add this for verbose logs
});
```

### Check Network Tab
- Open React Native Debugger
- Check Network tab for WebSocket connection
- Should see: `ws://your-api-url/socket.io/?EIO=4&transport=websocket`

## Still Not Working?

1. **Restart backend server** - Ensure latest code is running
2. **Clear app data** - Reinstall app or clear AsyncStorage
3. **Check firewall** - Ensure WebSocket port is open
4. **Verify API_BASE_URL** - Should match backend URL exactly
5. **Check JWT_SECRET** - Must match between frontend and backend

## Success Indicators

✅ Socket connects without disconnect
✅ Backend logs show room join
✅ Admin approval triggers frontend event
✅ Host navigates to dashboard automatically
✅ No "io server disconnect" errors

## Contact

If still having issues, provide these logs:
1. Frontend socket connection logs
2. Backend socket authentication logs
3. Admin approval emission logs
4. Network tab WebSocket frames
