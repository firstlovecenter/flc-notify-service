#!/usr/bin/env bash
#
# Callable smoke test for POST /send-push.
#
# Proves a push lands on a real dev device/emulator token. Requires a Firebase
# service account in the dev Secrets Manager secret (FIREBASE_SERVICE_ACCOUNT)
# and a real FCM token registered against an app in flc-platform-dev.
#
# Usage:
#   NOTIFY_URL="https://your-dev-url" \
#   FLC_NOTIFY_KEY="your-dev-key" \
#   FCM_TOKEN="real-dev-device-token" \
#   ./test-send-push.sh
#
# Optional:
#   FCM_TOPIC="test-topic"   # sends to a topic instead of tokens
#
# PII-safe: this script prints the HTTP response (which includes any failed
# tokens the caller must prune) but never echoes the secret key.

set -euo pipefail

: "${NOTIFY_URL:?Set NOTIFY_URL to the deployed dev endpoint (no trailing slash)}"
: "${FLC_NOTIFY_KEY:?Set FLC_NOTIFY_KEY to the dev x-secret-key}"

if [[ -n "${FCM_TOPIC:-}" ]]; then
  echo "→ Sending test push to topic: ${FCM_TOPIC}"
  BODY=$(cat <<JSON
{
  "topic": "${FCM_TOPIC}",
  "notification": { "title": "FLC push test", "body": "Topic push works 🎉" },
  "data": { "route": "/cycle-summary" }
}
JSON
)
else
  : "${FCM_TOKEN:?Set FCM_TOKEN to a real dev device token (or set FCM_TOPIC instead)}"
  echo "→ Sending test push to 1 device token"
  BODY=$(cat <<JSON
{
  "tokens": ["${FCM_TOKEN}"],
  "notification": { "title": "FLC push test", "body": "Push works 🎉" },
  "data": { "route": "/cycle-summary" }
}
JSON
)
fi

curl -sS -X POST "${NOTIFY_URL}/send-push" \
  -H "Content-Type: application/json" \
  -H "x-secret-key: ${FLC_NOTIFY_KEY}" \
  -d "${BODY}" \
  -w "\nHTTP %{http_code}\n"
