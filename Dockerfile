# syntax = docker/dockerfile:1.4

ARG NODE_VERSION=22.15.0-alpine3.20

FROM node:${NODE_VERSION} as build

RUN apk add git linux-headers alpine-sdk pixman pango cairo cairo-dev pango-dev pixman-dev

ENV PYTHONUNBUFFERED=1
ENV COREPACK_DEFAULT_TO_LATEST=0
RUN apk add --update python3 && ln -sf python3 /usr/bin/python
RUN apk add py3-pip py3-setuptools

RUN corepack enable

WORKDIR /pulsar

COPY --link . ./

RUN git submodule update --init --recursive
RUN pnpm config set fetch-retries 5
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
	--mount=type=cache,target=/root/.cache/Cypress,sharing=locked \
	pnpm i --frozen-lockfile --aggregate-output
RUN pnpm build
RUN mv packages/frontend/assets pulsar-assets
RUN mv packages/frontend-embed/assets pulsar-embed-assets

FROM node:${NODE_VERSION}

ARG UID="991"
ARG GID="991"
ENV COREPACK_DEFAULT_TO_LATEST=0

RUN apk add ffmpeg tini jemalloc pixman pango cairo libpng librsvg font-noto font-noto-cjk font-noto-thai \
	&& corepack enable \
	&& addgroup -g "${GID}" pulsar \
	&& adduser -D -u "${UID}" -G pulsar -h /pulsar pulsar \
	&& mkdir /pulsar/files \
	&& chown pulsar:pulsar /pulsar/files \
	&& find / -type d -path /sys -prune -o -type d -path /proc -prune -o -type f -perm /u+s -exec chmod u-s {} \; \
	&& find / -type d -path /sys -prune -o -type d -path /proc -prune -o -type f -perm /g+s -exec chmod g-s {} \;

USER pulsar
WORKDIR /pulsar

# add package.json to add pnpm
COPY --chown=pulsar:pulsar ./package.json ./package.json
RUN corepack install

COPY --chown=pulsar:pulsar --from=build /pulsar/node_modules ./node_modules
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/backend/node_modules ./packages/backend/node_modules
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/misskey-js/node_modules ./packages/misskey-js/node_modules
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/misskey-reversi/node_modules ./packages/misskey-reversi/node_modules
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/misskey-bubble-game/node_modules ./packages/misskey-bubble-game/node_modules
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/megalodon/node_modules ./packages/megalodon/node_modules
COPY --chown=pulsar:pulsar --from=build /pulsar/built ./built
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/misskey-js/built ./packages/misskey-js/built
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/misskey-reversi/built ./packages/misskey-reversi/built
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/misskey-bubble-game/built ./packages/misskey-bubble-game/built
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/backend/built ./packages/backend/built
COPY --chown=pulsar:pulsar --from=build /pulsar/packages/megalodon/built ./packages/megalodon/built
COPY --chown=pulsar:pulsar --from=build /pulsar/fluent-emojis ./fluent-emojis
COPY --chown=pulsar:pulsar --from=build /pulsar/tossface-emojis/dist ./tossface-emojis/dist
COPY --chown=pulsar:pulsar --from=build /pulsar/pulsar-assets ./packages/frontend/assets
COPY --chown=pulsar:pulsar --from=build /pulsar/pulsar-embed-assets ./packages/frontend-embed/assets

COPY --chown=pulsar:pulsar pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --chown=pulsar:pulsar packages/backend/package.json ./packages/backend/package.json
COPY --chown=pulsar:pulsar packages/backend/scripts/check_connect.js ./packages/backend/scripts/check_connect.js
COPY --chown=pulsar:pulsar packages/backend/ormconfig.js ./packages/backend/ormconfig.js
COPY --chown=pulsar:pulsar packages/backend/migration ./packages/backend/migration
COPY --chown=pulsar:pulsar packages/backend/assets ./packages/backend/assets
COPY --chown=pulsar:pulsar packages/megalodon/package.json ./packages/megalodon/package.json
COPY --chown=pulsar:pulsar packages/misskey-js/package.json ./packages/misskey-js/package.json
COPY --chown=pulsar:pulsar packages/misskey-reversi/package.json ./packages/misskey-reversi/package.json
COPY --chown=pulsar:pulsar packages/misskey-bubble-game/package.json ./packages/misskey-bubble-game/package.json

ENV LD_PRELOAD=/usr/lib/libjemalloc.so.2
ENV NODE_ENV=production
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["pnpm", "run", "migrateandstart"]
