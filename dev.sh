export APP_DEV=true

cd client
npm run check
npm run dev &
cd ..

deno run \
  --unstable \
  --allow-all \
  server/mod.ts
