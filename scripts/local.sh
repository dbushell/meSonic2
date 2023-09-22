#!/bin/zsh
source ~/.zshrc

killall() {
  trap '' SIGINT SIGTERM EXIT
  kill -TERM 0
  wait
}

trap 'killall' SIGINT SIGTERM EXIT

cd client
npm install --no-package-lock
npm run check
npm run dev &
cd ..

deno run --unstable --allow-all server/mod.ts &

caddy run --envfile .env --adapter caddyfile --config - <<EOF
*.{\$APP_DOMAIN} {
  tls {
    dns cloudflare {\$CF_DNS_API_TOKEN}
    resolvers 1.1.1.2
  }
  @mesonic2 host mesonic2.{\$APP_DOMAIN}
  handle @mesonic2 {
    handle /hmr {
      reverse_proxy {\$APP_HOSTNAME}:{\$APP_DEV_PORT}
    }
    reverse_proxy {\$APP_HOSTNAME}:{\$APP_PORT}
  }
}
EOF
