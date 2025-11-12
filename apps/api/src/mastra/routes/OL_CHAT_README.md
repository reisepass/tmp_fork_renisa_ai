# OL Chat Endpoint

> **⚠️ DEPRECATED:** This endpoint is no longer in use. Use the main `/chat` endpoint instead.
>
> This documentation is kept for reference only. The route has been disabled in the API.

## Overview

The `/ol-chat` endpoint is a new unified entry point for chat messages that uses intelligent triage-based routing to send messages directly to specialized agents.

## How It Works

1. **Receives message** from user
2. **Triages conversation** using `@renisa/triaging-lib` with heuristic-only mode
3. **Routes to appropriate agent** based on category
4. **Streams response** back to client

## Routing Logic

| Triage Category | Routes To | Status |
|----------------|-----------|--------|
| `First-Notice-Of-Loss` | `fnolAgent` | ✅ Implemented |
| `New-Policy` | `orchestratorAgent` | ⏳ TODO: Direct to salesWorkflow |
| `Manage-Policy` | `orchestratorAgent` | ⏳ TODO: Direct to policyManagementWorkflow |
| `General-Policy-Questions` | `orchestratorAgent` | ✅ Implemented |
| `Other` | `orchestratorAgent` | ✅ Implemented |

## API Endpoint

**URL:** `POST /api/ol-chat`

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "I want to report a car accident"
    }
  ],
  "memory": {
    "thread": "thread-123",
    "resource": "user-456"
  },
  "locale": "de-DE"
}
```

**Response:**
- Streaming response compatible with AI SDK's `useChat` hook
- Same format as existing `/chat` endpoints

## Testing Examples

### Test FNOL Routing
```bash
curl -X POST http://localhost:4111/api/ol-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I want to report a car accident that happened yesterday"
      }
    ],
    "memory": {
      "thread": "test-thread-1",
      "resource": "test-user-1"
    }
  }'
```
**Expected:** Routes to `fnolAgent`

### Test General Questions Routing
```bash
curl -X POST http://localhost:4111/api/ol-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What does liability insurance cover?"
      }
    ],
    "memory": {
      "thread": "test-thread-2",
      "resource": "test-user-2"
    }
  }'
```
**Expected:** Routes to `orchestratorAgent`

### Test New Policy Routing
```bash
curl -X POST http://localhost:4111/api/ol-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I want to buy a new liability insurance policy"
      }
    ],
    "memory": {
      "thread": "test-thread-3",
      "resource": "test-user-3"
    }
  }'
```
**Expected:** Routes to `orchestratorAgent` (will route to salesWorkflow in future)

## Performance Tracking

The endpoint includes comprehensive performance logging:
- Triage execution time
- Agent selection time
- Full request/response timing
- Category distribution analytics

Logs are visible in console and sent to Langfuse for observability.

## Benefits

1. **Fast routing** - Heuristic-only mode is instant (no LLM call)
2. **Deterministic** - Consistent routing based on keywords
3. **Cost-effective** - No extra LLM costs for routing decisions
4. **Observable** - Triage category tracked in Langfuse
5. **Non-breaking** - Existing `/chat` endpoints unchanged

## Future Enhancements

- [ ] Direct routing to `salesWorkflow` for New-Policy
- [ ] Direct routing to `policyManagementWorkflow` for Manage-Policy
- [ ] Multi-channel support (email, voice, SMS)
- [ ] A/B testing against orchestrator-only routing
- [ ] Custom routing rules per locale

## Migration Path

1. Test new endpoint alongside existing `/chat` endpoints
2. Compare response quality and performance
3. Gradually migrate channels (start with new features)
4. Keep existing endpoints as fallback
5. Eventually deprecate old endpoints once confident

## Notes

- The existing `/chat` endpoints are **completely unchanged**
- All orchestrator behavior is **preserved**
- This is purely additive functionality
- Can be disabled by not using the new endpoint
