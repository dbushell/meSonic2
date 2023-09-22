#!/bin/zsh
source ~/.zshrc

sudo chown $USER:$USER /mesonic

if ! command -v command_name &> /dev/null; then
  sudo curl "https://caddyserver.com/api/download?os=linux&arch=arm64&idempotency=74575022558541" -o caddy
  sudo chmod +x caddy
  sudo chown root:root caddy
  sudo mv caddy /usr/local/bin/
fi

killall() {
  trap '' SIGINT SIGTERM EXIT
  kill -TERM 0
  wait
}

trap 'killall' SIGINT SIGTERM EXIT

cd client
npm install
npm run check
npm run dev &
cd ..

deno run --unstable --allow-all server/mod.ts &

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
