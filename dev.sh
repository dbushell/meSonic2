export APP_DEV=true

cd app
npm run check
npm run dev &
cd ..

deno run \
  --unstable \
  --allow-all \
  src/mod.ts
