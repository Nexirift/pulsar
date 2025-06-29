# Contribution guide

We're glad you're interested in contributing to Sharkey! In this
document you will find the information you need to contribute to the
project. We assume you've *also* read Misskey's contribution guide,
[CONTRIBUTING.md](CONTRIBUTING.md).

## Issues

Before creating an issue, please check the following:

- To avoid duplication, please search for similar issues before
  creating a new issue.

- Do not use Issues to ask questions or troubleshooting.

  - Issues should only be used to feature requests, suggestions, and
    bug tracking.
  - Please ask questions or troubleshooting in
    [Discord](https://discord.gg/6VgKmEqHNk).

> [!WARNING]
> Do not close issues that are about to be resolved. It
> should remain open until a commit that actually resolves it is
> merged.

## Well-known branches

- **`stable`** branch is tracking the latest release and used for
  production purposes.
- **`develop`** branch is where we work for the next release.

  - When you create an MR, basically target it to this branch.

## Creating an MR

Thank you for your MR! Before creating an MR, please check the
following:

- If possible, prefix the title with a keyword that identifies the
  type of this MR, like `fix` / `refactor` / `feat` / `enhance` /
  `perf` / `chore` etc

- Also, make sure that the granularity of this MR is
  appropriate. Please do not include more than one type of change or
  interest in a single MR.

- If there is an Issue which will be resolved by this MR, please
  include a reference to the Issue in the text.

- Check if there are any documents that need to be created or updated
  due to this change.

- If you have added a feature or fixed a bug, please add a test case
  if possible.

- Please make sure that tests and Lint are passed in advance. You can
  run it with `pnpm test` and `pnpm lint`. [See more info](#testing)

- If this MR includes UI changes, please attach a screenshot in the
  text.

## Release process

(see also [the
wiki](https://activitypub.software/TransFem-org/Sharkey/-/wikis/release-process))

Prerequisites:

* `develop` contains exactly the code we want to release

  * it can be useful to mark MRs we want to release with the
    [`for-next-release`
    label](https://activitypub.software/TransFem-org/Sharkey/-/merge_requests?label_name[]=for-next-release)

* we have tested it enough to be confident we can release it to the
  world

* the CI pipeline (build, test, lint) passes

* the backend end-to-end tests (`pnpm --filter=backend test:e2e`) pass
  on your machine

* `package.json` and `packages/misskey-js/package.json` on `develop`
  have a `"version": "2027.12.0-dev"` or something similarly
  non-prod-looking

* the
  [changelogs](https://activitypub.software/TransFem-org/Sharkey/-/wikis/changelogs)
  contain all the changes we want to announce

To release:

* create a new Branch based on `develop` to change the version to a
  prod-looking one(e.g. `2027.12.1`)

	* try to avoid using the same version as Misskey, both to reduce
    confusion, and because (unlike branches) tags are not scoped by
    remote and will confuse multi-remote clones

* create a MR to merge the new Branch into `stable`

* once _that_ is merged, go to
  https://activitypub.software/TransFem-org/Sharkey/-/releases and
  create a new release

  * for the tag, use the same version you just set on `stable`
    (e.g. `2027.12.1`)

  * make sure the tag will be created on `stable`

	* for the release name, again use the version (e.g. `2027.12.1`)

	* for the release notes, copy the [changelogs](changelogs)

* wait for all the pipelines to complete

	* in the [container
    regirstry](https://activitypub.software/TransFem-org/Sharkey/container_registry/2?orderBy=NAME&sort=desc&search[]=)
    you should get (of course with the right version):

	  * `latest`
		* `2027.12.1-amd64`
		* `2027.12.1-arm64`

* announce the release on the official account!

Post release:

* branch off `develop`, merge `stable` into that, change the version
  to the _next_ number (e.g. `2028.1.0-dev`), create a MR for this
  branch, get it merged

### Hotfixes / security releases

Sometimes we need to release changes to the latest stable release, *without* whatever has been merged into `develop`. For example, a security fix.

In these cases:

* create a branch off `stable`, let's call it `hotfix/2027.12.2`, and
  change the version number on this branch

* create branches off `stable`, one per fix (like normal feature /
  bugfix branches, but starting from the released code), and send MRs
  targeting `hotfix/2027.12.2`

* once all the fixes have been merged into `hotfix/2027.12.2`, create
  a MR targeting `stable`

* now carry on through the normal release process (third step, the one
  starting "once that is merged…")

## Icon Font (Shark Font)

Sharkey has its own Icon Font called Shark Font which can be found at
https://activitypub.software/TransFem-org/shark-font

Build instructions can all be found over there in the `README`.

If you have an icon suggestion or want to add an Icon please open an
issue/merge request over at that repo.

When updating the font make sure to copy **all generated files** from
the `dest` folder into `packages/backend/assets/fonts/sharkey-icons`

For the CSS, copy the file content and replace the old content in
`style.css` and for the WOFF, TTF and SVG simply replace them.

## Development

### Accessing source code

In order to submit code changes, you will need to create a fork of the
main repository. This can be done via the GitLab UI, by pressing the
"Fork" button while signed into an activitypub.software GitLab
account.

Once you have created a fork, you should clone it locally and update
submodules using Git. For example, to clone using SSH, use the
following commands, replacing "<YOUR_USERNAME>" with your GitLab
username:

```bash
git clone git@activitypub.software:<YOUR_USERNAME>/Sharkey.git
git submodule update --init
```

### Environment setup

Before developing, you should set up a testing environment. You can do
this using Docker via the Docker Compose plugin. You will also need to
have `pnpm` installed.

(You may wish to perform this setup using system-wide software
installed separately, e.g. via a package manager, or using
Devcontainer. Both are possible, but they will require manual setup
that will not be covered in this document.)

First, you will need to copy
[`.config/docker_example.env`](.config/docker_example.env) to
`.config/docker.env`. This file will contain configurations for the
PostgreSQL database, such as username and password. You may set these
as you wish.  You will also need to copy
[`.config/example.yml`](.config/example.yml) to
`.config/default.yml`. This file will contain configurations for
Sharkey. Ensure that the username and password in the `db:` section
match the ones set in `docker.env`.

Now, use the following command to start a local database container:

```bash
docker compose -f compose.local-db.yml up -d
```

This will run a local PostgreSQL database server in the
background. (To stop the database, run `docker compose -f
compose.local-db.yml down`.)

Once the database is active, run the following commands:

```bash
pnpm build
pnpm migrate
```

This will build Sharkey and perform database migrations. After
finishing the migration, the database will be ready for use.

### Start developing

After making code changes, you can run Sharkey using the following
command:

```bash
pnpm dev
```

- Checks server-side source files and automatically builds them if
  they are modified. Automatically starts the server process(es).

- Vite HMR (just the `vite` command) is available. The behavior may be
  different from production.

- Service Worker is watched by esbuild.

- The frontend can be viewed by accessing `http://localhost:5173`.

- The backend listens on the port configured with `port` in
	`.config/default.yml`.  If you have not changed it from the default,
	it will be `http://localhost:3000`.

### Testing

(see also [Misskey's docs about testing](./CONTRIBUTING.md#testing))

To run many of the tests, you need a dedicated database.

* start PostgreSQL and Redis

* create the test configuration file:

	```bassh
	cp .config/test-example.yml .config/test.yml
	```

* start the database container:

	```bash
	docker compose -f packages/backend/test/compose.yml up
	```

Now you can run `pnpm test` and `pnpm --filter=backend test:e2e`

### Environment Variables

- `MISSKEY_CONFIG_DIR` changes the directory where config files are
  searched, defaults to [`.config/`](.config/) at the top of the repository
- `MISSKEY_CONFIG_YML` changes the configuration file name, defaults
  to `default.yml` (e.g. you can set `MISSKEY_CONFIG_YML=2nd.yml` to
  load `.config/2nd.yml`)
- `MISSKEY_WEBFINGER_USE_HTTP` if set to `true`, WebFinger requests
  will be http instead of https, useful for testing federation between
  servers in localhost. NEVER USE IN PRODUCTION.

## Continuous integration

Sharkey uses GitLab CI for executing automated tests.

Configuration files are located in [`.gitlab-ci.yml`](.gitlab-ci.yml).

### Merging from Misskey into Sharkey

Make sure you have both remotes in the same clone (`git remote add
misskey https://github.com/misskey-dev/misskey.git`), then:

	git remote update
	git checkout develop   # this is Sharkey's develop
	git checkout -m merge/$(date +%Y-%m-%d)   # or whatever
	git merge --no-ff misskey/develop

fix conflicts and *commit*! (conflicts in `pnpm-lock.yaml` can usually
be fixed by running `pnpm install`, it detects conflict markers and
seems to do a decent job)

*after that commit*, do all the extra work, on the same branch:

* copy all changes (commit after each step):
    * in `packages/backend/src/core/activitypub/models/ApNoteService.ts`, from `createNote` to `updateNote`
    * from `packages/backend/src/core/NoteCreateService.ts` to `packages/backend/src/core/NoteEditService.ts`
    * from `packages/backend/src/server/api/endpoints/notes/create.ts` to `packages/backend/src/server/api/endpoints/notes/edit.ts`
    * from MK note components to SK note components (if sensible)
        * from `packages/frontend/src/components/MkNote.vue` to `packages/frontend/src/components/SkNote.vue`
        * from `packages/frontend/src/components/MkNoteDetailed.vue` to `packages/frontend/src/components/SkNoteDetailed.vue`
        * from `packages/frontend/src/components/MkNoteHeader.vue` to `packages/frontend/src/components/SkNoteHeader.vue`
        * from `packages/frontend/src/components/MkNoteSimple.vue` to `packages/frontend/src/components/SkNoteSimple.vue`
        * from `packages/frontend/src/components/MkNoteSub.vue` to `packages/frontend/src/components/SkNoteSub.vue`
    * from MK note components to Dynamic note components (if the public signature changed)
        * from `packages/frontend/src/components/MkNote.vue` to `packages/frontend/src/components/DynamicNote.vue`
        * from `packages/frontend/src/components/MkNoteDetailed.vue` to `packages/frontend/src/components/DynamicNoteDetailed.vue`
        * from `packages/frontend/src/components/MkNoteSimple.vue` to `packages/frontend/src/components/DynamicNoteSimple.vue`
    * from the global timeline to the bubble timeline
        * `packages/backend/src/server/api/stream/channels/global-timeline.ts`
        * `packages/backend/src/server/api/stream/channels/bubble-timeline.ts`
        * `packages/frontend/src/timelines.ts`
        * `packages/frontend/src/components/MkTimeline.vue`
        * `packages/frontend/src/pages/timeline.vue`
        * `packages/frontend/src/ui/deck/tl-column.vue`
        * `packages/frontend/src/widgets/WidgetTimeline.vue`
    * from `packages/backend/src/queue/processors/InboxProcessorService.ts` to `packages/backend/src/core/UpdateInstanceQueue.ts`, where `updateInstanceQueue` is impacted
    * from `.config/example.yml` to `.config/ci.yml` and `chart/files/default.yml`
    * in `packages/backend/src/core/MfmService.ts`, from `toHtml` to `toMastoApiHtml`
    * from `verifyLink` in `packages/backend/src/core/activitypub/models/ApPersonService.ts` to `verifyFieldLinks` in `packages/backend/src/misc/verify-field-link.ts` (if sensible)

* if there have been any changes to the federated user data (the
  `renderPerson` function in
  `packages/backend/src/core/activitypub/ApRendererService.ts`), make
  sure that the set of fields in `userNeedsPublishing` and
  `profileNeedsPublishing` in
  `packages/backend/src/server/api/endpoints/i/update.ts` are still
  correct.

* check the changes against our `develop` (`git diff develop`) and
  against Misskey (`git diff misskey/develop`)

* re-generate `misskey-js` (`pnpm build-misskey-js-with-types`) and
  commit

* re-generate locales (`pnpm run build-assets`) and commit

* build the frontend: `rm -rf built/; NODE_ENV=development pnpm
  --filter=frontend --filter=frontend-embed --filter=frontend-shared
  build` (the `development` tells it to keep some of the original
  filenames in the built files)

* make sure there aren't any new `ti-*` classes (Tabler Icons), and
  replace them with appropriate `ph-*` ones (Phosphor Icons) in
  [`vite.replaceicons.ts`](packages/frontend/vite.replaceIcons.ts).

    * This command should show you want to change: `grep -ohrP
      '(?<=["'\''](ti )?)(ti-(?!fw)[\w\-]+)' --exclude \*.map --
      built/ | sort -u`.

    * NOTE: `ti-fw` is a special class that's defined by Misskey,
      leave it alone.

    * After every change, re-build the frontend and check again, until
      there are no more `ti-*` classes in the built files.

    * Commit!

* double-check the new migration, that they won't conflict with our db
  changes: `git diff develop -- packages/backend/migration/`

* `pnpm clean; pnpm build`

* run tests `pnpm test; pnpm --filter backend test:e2e` (requires a
  test database, [see above](#testing)) and fix them all (the e2e
  tests randomly fail with weird errors like `relation "users" does
  not exist`, run them again if that happens)

* run lint `pnpm --filter=backend --filter=frontend-shared lint` +
  `pnpm --filter=frontend --filter=frontend-embed eslint` and fix all
  the problems

Then push and open a Merge Request.

### Memory Caches

Sharkey offers multiple memory cache implementations, each meant for a
different use case.  The following table compares the available
options:

| Cache               | Type      | Consistency | Persistence | Data Source | Cardinality | Eviction | Description                                                                                                                                                                                                                                                                |
|---------------------|-----------|-------------|-------------|-------------|-------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `MemoryKVCache`     | Key-Value | None        | None        | Caller      | Single      | Lifetime | Implements a basic in-memory Key-Value store. The implementation is entirely synchronous, except for user-provided data sources.                                                                                                                                           |
| `MemorySingleCache` | Single    | None        | None        | Caller      | Single      | Lifetime | Implements a basic in-memory Single Value store. The implementation is entirely synchronous, except for user-provided data sources.                                                                                                                                        |
| `RedisKVCache`      | Key-Value | Eventual    | Redis       | Callback    | Single      | Lifetime | Extends `MemoryKVCache` with Redis-backed persistence and a pre-defined callback data source. This provides eventual consistency guarantees based on the memory cache lifetime.                                                                                            |
| `RedisSingleCache`  | Single    | Eventual    | Redis       | Callback    | Single      | Lifetime | Extends `MemorySingleCache` with Redis-backed persistence and a pre-defined callback data source. This provides eventual consistency guarantees based on the memory cache lifetime.                                                                                        |
| `QuantumKVCache`    | Key-Value | Immediate   | None        | Callback    | Multiple    | Lifetime | Combines `MemoryKVCache` with a pre-defined callback data source and immediate consistency via Redis sync events. The implementation offers multi-item batch overloads for efficient bulk operations. **This is the recommended cache implementation for most use cases.** |

Key-Value caches store multiple entries per cache, while Single caches
store a single value that can be accessed directly.  Consistency
refers to the consistency of cached data between different processes
in the instance cluster: "None" means no consistency guarantees,
"Eventual" caches will gradually become consistent after some unknown
time, and "Immediate" consistency ensures accurate data ASAP after the
update.  Caches with persistence can retain their data after a reboot
through an external service such as Redis.  If a data source is
supported, then this allows the cache to directly load missing data in
response to a fetch.  "Caller" data sources are passed into the fetch
method(s) directly, while "Callback" sources are passed in as a
function when the cache is first initialized.  The cardinality of a
cache refers to the number of items that can be updated in a single
operation, and eviction, finally, is the method that the cache uses to
evict stale data.

#### Selecting a cache implementation

For most cache uses, `QuantumKVCache` should be considered first.  It
offers strong consistency guarantees, multiple cardinality, and a
cleaner API surface than the older caches.

An alternate cache implementation should be considered if any of the
following apply:

* The data is particularly slow to calculate or difficult to
  access. In these cases, either `RedisKVCache` or `RedisSingleCache`
  should be considered.

* If stale data is acceptable, then consider `MemoryKVCache` or
  `MemorySingleCache`. These synchronous implementations have much
  less overhead than the other options.

* There is only one data item, or all data items must be fetched
  together. Using `MemorySingleCache` or `RedisSingleCache` could
  provide a cleaner implementation without resorting to hacks like a
  fixed key.
