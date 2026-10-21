# Hello, Someday

A cheerful retirement countdown that counts working days, holidays and PTO. Built with plain HTML, CSS and JavaScript. No account, database or runtime dependencies.

## Run and test

Requires Node.js 22 or later.

```sh
npm ci
npm test
npm run check
npm start
```

The preview is at http://127.0.0.1:4175. Production hosting must use HTTPS for service workers and installation support.

## GitHub Pages

The deployable app is already in `dist/`; there is no build step. The included workflow runs tests, uploads only `dist/`, and deploys with GitHub Pages on pushes to `main` or manual runs. Pull requests run tests but cannot deploy. The deploy job uses GitHub's short-lived workflow token with Pages/OIDC permissions; no personal access token or repository secret is required.

After the repository is created, choose **Settings > Pages > Build and deployment > GitHub Actions**. Successful deployment exposes its actual URL in the workflow's `github-pages` environment. Do not infer success from a queued run.

All asset links, the manifest's start URL/scope, and service-worker paths are relative, so the app supports a project URL under `/HelloSomeday/`. Preserve the trailing slash on the app's directory URL. Only one independent countdown should be installed per origin as the browser-storage keys and cache namespace are shared across paths on the same origin.

GitHub's workflow documentation: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Your countdown

- Monday-Friday is the default workweek; any weekdays can be selected.
- Retirement date means first retired day by default. It can instead mean last working day.
- Today counts if scheduled unless the include-today setting is turned off.
- Holidays and PTO are inclusive date ranges. Overlaps and non-working days are counted only once; reversed ranges are rejected.
- Dates use local calendar days, without daylight-saving-time arithmetic.
- The calendar, daily encouragements and milestone celebrations work locally.
- Automatic celebrations wait for a visible tab and for dialogs to close. Each milestone displays once per date/meaning combination. The preview does not consume milestone history. Reduced-motion mode keeps the message without moving particles.

## Privacy, migration and iPhone installation

Settings, holidays and PTO are stored only in the current browser's localStorage. They are not in this repository, do not sync between devices, and are removed if website data is cleared. The app has no tracking or data-upload API; the hosting provider may keep ordinary request logs.

Before moving from another host:

1. On the original app, open About and choose **Export backup**.
2. Open the new Pages URL and choose **Restore backup**.
3. Verify the date, working weekdays and time off.
4. On iPhone Safari, use **Share > Add to Home Screen**, enable **Open as Web App** if shown, and tap **Add**.
5. Check settings again in the Home Screen app because its storage may be separate from Safari.

A different domain/subdomain has separate browser storage. The old Home Screen icon still points to the old host; add the new URL separately. JSON backups include personal countdown settings and time off, but not already-seen celebration history. Keep backups private; never commit them. The original host can remain available during migration.

Offline use works after the app has loaded once on HTTPS. A first visit needs a connection. There are no background notifications.

## Project files

- `dist/`: complete static app and PWA icons.
- `tests/`: calculation, DOM, milestone, and service-worker tests.
- `scripts/serve.mjs`: local preview.
- `scripts/generate-icons.py`: original dependency-free icon generator.
- `.github/workflows/pages.yml`: tests and deployment.

This publishing copy contains app source only, with no prior project history, hosting metadata, credentials, evidence screenshots or personal backups.
