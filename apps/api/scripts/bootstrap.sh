#!/bin/sh
set -e

if [ -n "$CONFIG_SECRET_ID" ]; then
  echo "Loading secrets from: $CONFIG_SECRET_ID"
  REGION="${AWS_REGION:-$AWS_DEFAULT_REGION}"
  
  if [ -z "$REGION" ]; then
    echo "Warning: AWS region not set"
  else
    echo "Fetching secrets from region: $REGION"
    SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "$CONFIG_SECRET_ID" --region "$REGION" --query SecretString --output text 2>/dev/null || echo "null")
    
    if [ "$SECRET_JSON" != "null" ] && [ "$SECRET_JSON" != "None" ]; then
      echo "Secrets retrieved, setting environment variables"
      # Use eval with properly escaped values
      eval "$(echo "$SECRET_JSON" | jq -r 'to_entries[] | "export \(.key)=\(.value|tostring|@sh)"')"
      echo "Secrets loaded successfully"
    else
      echo "No secrets found or access denied"
    fi
  fi
else
  echo "No CONFIG_SECRET_ID set, skipping secrets loading"
fi

echo "Starting application..."
exec "$@"
