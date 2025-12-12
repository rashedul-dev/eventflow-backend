# #!/usr/bin/env bash
# # exit on error
set -o errexit

npm install
npm run build
npm run db:generate
npm run db:migrate:prod
npm run db:seed