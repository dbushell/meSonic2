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
  server/mod.ts &

caddy run --envfile .env --adapter caddyfile --config - <<EOF
{
  auto_https off
}
http://{\$APP_HOSTNAME}:4040 {
  handle /hmr {
    reverse_proxy {\$APP_HOSTNAME}:{\$APP_DEV_PORT}
  }
  reverse_proxy {\$APP_HOSTNAME}:{\$APP_PORT}
}
EOF
