#!/bin/bash
# Script to apply CORS configuration to Firebase Storage bucket
# This requires gsutil to be installed and authenticated

BUCKET_NAME="ojawa-ecommerce.firebasestorage.app"

echo "Applying CORS configuration to Firebase Storage bucket: $BUCKET_NAME"
echo ""

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil is not installed."
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Apply CORS configuration
gsutil cors set cors.json gs://$BUCKET_NAME

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "Verifying CORS configuration:"
    gsutil cors get gs://$BUCKET_NAME
else
    echo "❌ Error: Failed to apply CORS configuration"
    exit 1
fi

