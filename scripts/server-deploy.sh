#!/bin/bash
set -e
cd /var/www/yuan-showroom

echo "=== 1/5 Cleaning FTS shadow tables ==="
sqlite3 prisma/dev.db "DROP TABLE IF EXISTS document_fts; DROP TABLE IF EXISTS document_fts_data; DROP TABLE IF EXISTS document_fts_idx; DROP TABLE IF EXISTS document_fts_docsize; DROP TABLE IF EXISTS document_fts_content; DROP TABLE IF EXISTS document_fts_config;" 2>/dev/null || true

echo "=== 2/5 Prisma db push ==="
npx prisma db push --accept-data-loss

echo "=== 3/5 Seed ==="
npx tsx prisma/seed.ts

echo "=== 4/5 Rebuild FTS index ==="
npx tsx scripts/fts-migrate.ts

echo "=== 5/5 Restart PM2 ==="
pm2 restart yuan-showroom

echo "=== Verify ==="
sleep 2
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3001/showroom/
echo ""
echo "Deploy done."
