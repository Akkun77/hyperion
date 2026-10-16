# Application screenshots

Captured on 2026-10-16 from the running HYPERION React application using the real in-app browser. The desktop viewport was set to 1440 × 1000; the browser capture surface excludes its scrollbar gutter on scrollable pages, so some exported images are 1425 × 990. Original browser JPEG captures were transcoded to lossless WebP without changing their displayed content. No image-generation tool was used.

Operational pages were connected to a separately started instance of the current `backend/app.py`, with a **new, synthetic-only SQLite database** outside the repository. Existing local databases and running development servers were not changed. All requests shown are built-in controlled examples; reserved benchmark IP addresses and `user_101`/`user_202` are synthetic. No actual token, private contact data or production credential is shown. The partial hash in the token-misuse finding is a detector-generated fingerprint of a synthetic demo credential, not an access token.

| Image | Actual application state |
| --- | --- |
| `homepage.webp` | Original emerald loop, restored hero and working navigation; introduction completed |
| `overview.webp` | Five registered/observed catalog endpoints, 23 synthetic requests, three findings and two shadow endpoints; Live Signal collapsed through its own control |
| `api-inventory.webp` | Managed vs shadow and registered-only vs observed routes; actual endpoint risk scores |
| `traffic-activity.webp` | Server-side activity summary and chart for the controlled request burst |
| `threat-findings.webp` | BOLA, token misuse and scraping findings with persisted evidence; correctly marked historical relative to inbox opening |
| `risk-intelligence.webp` | Actual platform and service risk hierarchy; progressive sections initially collapsed |
| `execution-flow.webp` | Seven-stage trace for persisted BOLA alert #3 and request #21, including recorded risk 85 |
| `investigation.webp` | Real navigation from that BOLA flow to its linked traffic evidence |
| `watch-hyperion-work.webp` | A second explicit BOLA execution, followed by the actual manual Request stage and compact controls; top 850 pixels retained to end at whitespace before the off-screen technical ledger |

The controlled backend scenarios were run in sequence: normal, scraping, token misuse, BOLA and shadow discovery, followed by the second built-in shadow route and built-in catalog registration. The later browser-run BOLA walkthrough appended one additional synthetic request/finding in the same disposable dataset. Thus images taken at different points need not have identical record totals. Risk reflects accumulated state, not a fixed score assigned to each demo.

Screenshots are representative viewport views, not full-page exports. All pictured data was returned by the actual backend. No DOM values, metrics, findings, risk factors or connection status were substituted to create the images. WebGL naturally moves between captures. The later risk stage was also inspected in-browser and displayed the recorded 85/100 score and backend factors; the selected gallery capture favors the more compact Request stage.

Older `hyperion-desktop.jpg` and `hyperion-mobile.jpg` files are retained historical marketing captures; they are not the current operational gallery and were not recaptured for this release.
