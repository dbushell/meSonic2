#!/bin/zsh
source ~/.zshrc

killall() {
  trap '' SIGINT SIGTERM EXIT
  kill -TERM 0
  wait
}

trap 'killall' SIGINT SIGTERM EXIT

export APP_DEV=false
export APP_LOG_LEVEL=INFO

(
  cd client
  npm install
  npm run build
)

deno run \
  --unstable \
  --allow-env \
  --allow-read \
  --allow-write \
  --allow-net \
  --allow-ffi \
  server/mod.ts &

wait
