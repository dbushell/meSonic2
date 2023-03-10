#!/bin/zsh
source ~/.zshrc

killall() {
  trap '' SIGINT SIGTERM EXIT
  kill -TERM 0
  wait
}

trap 'killall' SIGINT SIGTERM EXIT

export APP_DEV=true

cd client
npm run check
npm run dev &
cd ..

deno run \
  --unstable \
  --allow-all \
  server/mod.ts
