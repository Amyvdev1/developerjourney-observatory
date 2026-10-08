# Verification evidence

Verified locally on **8 October 2026**, using Windows, Node.js 24.19.0 and Chromium through Playwright 1.62.1.

| Gate | Result |
|---|---|
| JavaScript syntax checks | Passed |
| Domain, HTTP, persistence and report snapshot tests | **13 passed; zero failures; zero skipped** |
| Vite 7.3.7 production build | Passed |
| Desktop browser flow · 1440 × 1000 | Passed |
| Mobile browser flow · 390 × 844 | Passed |
| Actual form interactions, saved history and exports | Passed |
| Browser runtime errors / horizontal overflow | None detected in the tested flows |
| npm dependency audit | Zero reported vulnerabilities after the Vite update |
| Docker execution | Not run |
| Hosted production deployment | Not performed; local service only |

Tests exercise real loopback HTTP requests, revision conflicts, transaction persistence across service restart and export generation. Browser tests are distinct from domain tests and do not inflate the test count above.

The Verify GitHub Actions workflow runs syntax checks, tests, production build and the browser suite on Ubuntu with Node 24. See the repository's **Actions** tab for the current remote outcome; a workflow file alone is not a passing run.

Screenshots in this directory are captured from the actual running dashboard, using synthetic/local data. They are not rendered design mockups.
