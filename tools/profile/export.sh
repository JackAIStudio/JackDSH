#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="${1:-$HOME/Desktop/jack-profile.enc}"

echo "========================================="
echo "   Jack DSH「三剑客」Profile 快速导出"
echo "========================================="

node "$DIR/export.mjs" -o "$OUTPUT"
