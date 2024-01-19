FROM node:latest as builder

COPY client /mesonic/client
COPY .env /mesonic/.env

WORKDIR /mesonic/client

RUN npm install && NODE_ENV=production npm run build

FROM denoland/deno:1.39.1

COPY --from=builder /mesonic/client/build /mesonic/build
COPY server /mesonic/server
COPY deno.json /mesonic/deno.json

CMD ["run", "--unstable", "--allow-ffi", "--allow-env", "--allow-net", "--allow-read", "--allow-write", "/mesonic/server/mod.ts"]
