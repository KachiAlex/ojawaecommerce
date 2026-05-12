#!/bin/bash
# OWASP ZAP Security Scan Script
# Install ZAP: https://www.zaproxy.org/download/

TARGET_URL="${1:-https://ojawa-ecommerce.web.app}"
REPORT_DIR="security-tests/zap-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting OWASP ZAP security scan for: $TARGET_URL"

# Create reports directory
mkdir -p "$REPORT_DIR"

# Run ZAP baseline scan
zap-baseline.py -t "$TARGET_URL" \
  -J "$REPORT_DIR/zap-report-$TIMESTAMP.json" \
  -r "$REPORT_DIR/zap-report-$TIMESTAMP.html" \
  -I \
  -j \
  -g "$REPORT_DIR/zap-config-$TIMESTAMP.conf"

echo "Scan complete. Reports saved to: $REPORT_DIR"

# Check for high/critical issues
HIGH_ISSUES=$(grep -c "High" "$REPORT_DIR/zap-report-$TIMESTAMP.json" || echo "0")
CRITICAL_ISSUES=$(grep -c "Critical" "$REPORT_DIR/zap-report-$TIMESTAMP.json" || echo "0")

echo "High severity issues: $HIGH_ISSUES"
echo "Critical severity issues: $CRITICAL_ISSUES"

if [ "$HIGH_ISSUES" -gt 0 ] || [ "$CRITICAL_ISSUES" -gt 0 ]; then
  echo "⚠️  WARNING: Security issues found!"
  exit 1
fi

exit 0

