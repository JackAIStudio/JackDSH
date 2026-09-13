#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT="${1:-$DIR/jack-profile.enc}"

echo "========================================="
echo "   Jack DSH「三剑客」Profile 快速恢复"
echo "========================================="

node "$DIR/import.mjs" -i "$INPUT"
