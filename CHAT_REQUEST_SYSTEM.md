# Chat Request System - Tinder/Bumble Style

## Overview
Implemented a chat request system where User A sends a message, and User B must accept before they can chat.

## How It Works

### User A (Sender) Flow:
1. Opens discover screen and sees User B on radar
2. Taps on User B to open chat
3. Sees "Start a Conversation" screen with quick message suggestions
4. Sends first message (e.g., "Hey! 👋")
5. Message is sent as a chat request
6. Waits for User B to accept

### User B (Receiver) Flow:
1. Receives socket event `receive_message` with first message
2. Chat store detects this is a NEW chat request (no existing messages)
3. Stores request in `chatRequests` state
4. Triggers notification callback
5. Shows notification banner: "💬 Chat Request from {Name}"
6. Shows full-screen chat request modal with:
   - Sender's profile picture
   - Sender's name
   - First message preview
   - "Accept & Chat" button (green)
   - "Decline" button (gray)

### After User B Accepts:
1. Chat request moved from `chatRequests` to `acceptedChats`
2. First message added to `messagesByPeer`
3. Chat modal opens automatically
4. Both users can now chat freely
5. Future messages show as normal chat messages with notifications

### After User B Declines:
1. Chat request removed from `chatRequests`
2. No chat is created
3. User A is not notified (silent rejection)

## Technical Implementation

### Frontend Changes (mobile/src)

#### 1. Chat Store (`mobile/src/store/chatStore.ts`)
- Added `chatRequests` state to track pending requests
- Added `acceptedChats` Set to track which chats are accepted
- Added `onChatRequest` callback for new request notifications
- Modified `receive_message` handler to detect first messages
- Added `acceptChatRequest()` function
- Added `rejectChatRequest()` function
- Added `setChatRequestCallback()` function

#### 2. Discover Screen (`mobile/src/app/(user)/discover.tsx`)
- Added `chatRequestModal` state
- Setup `setChatRequestCallback` to show modal when request received
- Added full-screen chat request modal UI with:
  - Profile image with chat icon badge
  - Sender name in purple
  - Message preview in styled box
  - Accept button (opens chat immediately)
  - Decline button (dismisses request)
  - Close button (dismiss without action)

### Backend Changes (party-user-backend)

#### Socket Configuration (`party-user-backend/src/config/socket.js`)
- Added sender profile image fetch in `send_message` handler
- Includes `senderImage` in message payload
- Payload now contains:
  ```javascript
  {
    tempId,
    senderId,
    receiverId,
    content,
    timestamp,
    isRead: false,
    senderName,
    senderImage
  }
  ```

## State Management

### Chat Request States:
1. **Pending**: Request in `chatRequests` object, modal shown
2. **Accepted**: Moved to `acceptedChats` Set, messages in `messagesByPeer`
3. **Rejected**: Removed from `chatRequests`, no trace left

### Message Flow:
```
User A sends "Hey!" 
  ↓
Backend emits receive_message to User B
  ↓
Chat Store checks: Is this first message from this user?
  ↓
YES → Store as chat request → Show modal
NO → Add to messages → Show notification (if accepted)
```

## UI/UX Features

### Chat Request Modal:
- Full-screen overlay with dark background
- Centered card with purple accent
- Large profile picture (100x100)
- Chat bubble icon badge on profile
- "Chat Request" title
- "from {Name}" in purple
- Message preview in styled box with "FIRST MESSAGE" label
- Two prominent action buttons
- Close button in top-right corner

### Notifications:
- Banner notification: "💬 Chat Request from {Name}"
- Shows message preview
- Tapping banner can open modal (future enhancement)

### Chat Modal Behavior:
- If no messages exist: Shows "Start a Conversation" UI
- If messages exist: Shows normal chat interface
- After accepting request: Automatically opens chat

## Testing Steps

### Test 1: Send Chat Request
1. **User A**: Open discover screen
2. **User A**: Tap on User B from radar
3. **User A**: Send "Hey! 👋"
4. **User B**: Should see notification banner
5. **User B**: Should see chat request modal appear
6. **User B**: Modal shows User A's photo, name, and message

### Test 2: Accept Chat Request
1. **User B**: Tap "Accept & Chat" button
2. **User B**: Chat modal opens with User A
3. **User B**: Can see first message in chat
4. **User B**: Can reply to User A
5. **User A**: Receives reply as normal message

### Test 3: Reject Chat Request
1. **User B**: Tap "Decline" button
2. **User B**: Modal closes
3. **User B**: No chat created
4. **User A**: Not notified of rejection

### Test 4: Multiple Requests
1. **User C**: Sends request to User B
2. **User D**: Sends request to User B
3. **User B**: Sees both requests (one at a time)
4. **User B**: Can accept one, reject another

## Backend Logs to Check

When User A sends message:
```
💬 [send_message] Received: { senderId: 'A_ID', receiverId: 'B_ID', content: 'Hey! 👋' }
📤 [send_message] Emitting to receiver: { senderName: 'User A', senderImage: 'url' }
✅ [send_message] Emitted to socket: socket_B
```

## Frontend Logs to Check

When User B receives request:
```
📨 [ChatStore] receive_message event: { senderId, content }
🔔 [ChatStore] New chat request from: B_ID
🔔 [ChatStore] Triggering chat request callback
🔔 [Discover] Chat request received: { senderId, senderName, content }
```

When User B accepts:
```
✅ [ChatStore] Accepting chat request from: A_ID
```

## Files Modified

### Backend (✅ Pushed to GitHub):
- `party-user-backend/src/config/socket.js`

### Frontend (⚠️ Not committed yet):
- `mobile/src/store/chatStore.ts`
- `mobile/src/app/(user)/discover.tsx`

## Next Steps

1. **Restart backend on Render** to get new changes
2. **Test with two devices** following the test steps above
3. **Optional enhancements**:
   - Add "View Profile" button in chat request modal
   - Add request expiry (auto-reject after 24 hours)
   - Add request list screen to see all pending requests
   - Add notification sound/vibration
   - Add push notifications for offline users

## Privacy & Safety

- User A doesn't know if request was rejected (prevents harassment)
- User B can decline without explanation
- No spam: Only first message triggers request
- User B controls who they chat with
- Requests are ephemeral (not stored in database)

## Known Limitations

1. Requests are stored in memory (lost on app restart)
2. No request history/archive
3. No "block user" feature yet
4. No report/flag system yet
5. Offline users won't see requests until they open app

These can be addressed in future updates if needed.
