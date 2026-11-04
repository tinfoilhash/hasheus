# syntax=docker/dockerfile:1

# vp provisions the node.js and pnpm versions in `devEngines`.
FROM ghcr.io/voidzero-dev/vite-plus:1.5.0 AS build
WORKDIR /hasheus
COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=vp:vp patches patches
RUN vp install --frozen-lockfile
COPY --chown=vp:vp . .
RUN vp build

FROM scratch AS export
COPY --from=build /hasheus/dist .

FROM lipanski/docker-static-website:2.6.0
COPY --from=export . .
COPY <<EOF httpd.conf
E404:index.html
EOF
CMD ["/busybox-httpd", "-f", "-v", "-p", "3000", "-c", "httpd.conf"]
