# Chat Message Delivery Debug Guide

## Problem
User A sends "hii" but User B doesn't receive the message and no notification appears.

## Changes Made

### Backend Changes (party-user-backend)
✅ **Pushed to GitHub**

1. **Enhanced Socket Connection Logging**
   - Added detailed logs when users connect/disconnect
   - Shows userId, socketId, total sockets per user, and total users online
   - Logs: `🔌 [Socket] User connected:` and `👋 [Socket] User fully disconnected:`

2. **Message Send Event Debugging**
   - Added comprehensive logging for `send_message` event
   - Shows sender, receiver, content preview, and tempId
   - Logs receiver socket count and all connected user IDs
   - Logs each socket emission with confirmation
   - Logs database save confirmation

3. **Sender Name in Payload**
   - Backend now fetches sender's name and includes it in message payload
   - Enables proper notification display with sender name

4. **Key Log Points**
   ```
   💬 [send_message] Received: { senderId, receiverId, content, tempId }
   👥 [send_message] Receiver sockets: { receiverId, socketCount, allUsers }
   📤 [send_message] Emitting to receiver: { receiverId, socketIds, payload }
   ✅ [send_message] Emitted to socket: <socketId>
   💾 [send_message] Saved to DB: <messageId>
   ```

### Frontend Changes (mobile/src)
⚠️ **NOT committed yet** - User will commit when building APK

1. **Chat Store Debugging**
   - Added logging for socket connection
   - Added logging for `receive_message` event
   - Added logging for message send with acknowledgment
   - Shows when messages are added to store

2. **Notification System**
   - Added `onMessageReceived` callback to chat store
   - Integrated with NotificationContext to show banner
   - Displays: "New message from {senderName}" with content preview

3. **Discover Screen Integration**
   - Sets up notification callback when screen loads
   - Shows in-app banner when message received
   - Uses existing notification system

## How to Test

### Step 1: Restart Backend on Render
The backend changes are pushed to GitHub. You need to restart the backend on Render for the new logs to appear.

### Step 2: Test with Two Devices/Users

**User A (Sender):**
1. Open discover screen
2. Check console logs for: `🔌 [ChatStore] Socket connected: <socketId>`
3. Tap on User B from radar
4. Send message "hii"
5. Check logs for:
   ```
   📤 [ChatStore] Sending message: { receiverId, content, currentUserId }
   🚀 [ChatStore] Emitting send_message event
   ✅ [ChatStore] Received acknowledgment: { success: true, ... }
   ```

**User B (Receiver):**
1. Open discover screen
2. Check console logs for: `🔌 [ChatStore] Socket connected: <socketId>`
3. Wait for message from User A
4. Check logs for:
   ```
   📨 [ChatStore] receive_message event: { senderId, receiverId, content, tempId }
   ✅ [ChatStore] Adding message to store: { peerId, messageCount }
   🔔 [ChatStore] Triggering notification callback
   🔔 [Discover] Message received notification: { senderId, senderName, content }
   ```
5. Should see notification banner: "New message from User A"

### Step 3: Check Backend Logs on Render

Look for these logs in Render dashboard:

**When User A connects:**
```
🔌 [Socket] User connected: { userId: 'A_ID', socketId: 'socket_A', totalSockets: 1, totalUsers: 1 }
```

**When User B connects:**
```
🔌 [Socket] User connected: { userId: 'B_ID', socketId: 'socket_B', totalSockets: 1, totalUsers: 2 }
```

**When User A sends message:**
```
💬 [send_message] Received: { senderId: 'A_ID', receiverId: 'B_ID', content: 'hii', tempId: 'temp_...' }
👥 [send_message] Receiver sockets: { receiverId: 'B_ID', socketCount: 1, allUsers: ['A_ID', 'B_ID'] }
📤 [send_message] Emitting to receiver: { receiverId: 'B_ID', socketIds: ['socket_B'], payload: {...} }
✅ [send_message] Emitted to socket: socket_B
✅ [send_message] Acknowledged to sender
💾 [send_message] Saved to DB: <messageId>
```

## Debugging Checklist

If User B still doesn't receive messages, check:

### ✅ User B is connected to socket
- Look for: `🔌 [Socket] User connected:` with User B's ID
- If not found: User B's socket connection failed

### ✅ User B's socket is tracked in users Map
- Look for: `allUsers: ['A_ID', 'B_ID']` in send_message logs
- If B_ID not in list: Socket connected but not tracked properly

### ✅ Message is emitted to User B's socket
- Look for: `📤 [send_message] Emitting to receiver:` with User B's socket ID
- Look for: `✅ [send_message] Emitted to socket: <B's socketId>`
- If not found: Receiver socket lookup failed

### ✅ User B's frontend receives the event
- Look for: `📨 [ChatStore] receive_message event:` in User B's console
- If not found: Socket event not reaching frontend (network issue?)

### ✅ Message is added to store
- Look for: `✅ [ChatStore] Adding message to store:`
- If not found: Message received but store update failed

### ✅ Notification is triggered
- Look for: `🔔 [Discover] Message received notification:`
- Should see banner appear on screen

## Common Issues & Solutions

### Issue 1: User B not in allUsers list
**Cause:** Socket connection failed or JWT token invalid
**Solution:** Check User B's token, ensure socket.io connection succeeds

### Issue 2: socketCount is 0 for User B
**Cause:** User B disconnected or never connected
**Solution:** Ensure User B opens discover screen and stays on it

### Issue 3: Message emitted but not received
**Cause:** Network issue, socket.io transport problem
**Solution:** Check network connectivity, try refreshing app

### Issue 4: Message received but no notification
**Cause:** Notification callback not set up
**Solution:** Ensure discover screen is mounted and callback is registered

## Next Steps

1. **Restart backend on Render** to get new logs
2. **Test with two devices** following the steps above
3. **Share backend logs** if issue persists
4. **Share frontend console logs** from both User A and User B

The comprehensive logging will pinpoint exactly where the message delivery fails.
