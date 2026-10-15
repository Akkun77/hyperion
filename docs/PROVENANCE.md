# Source continuity and publication

This feature branch extends the existing Akkun77/hyperion repository and retains its original commits and contributors. No history was replaced or rewritten.

The integrated application was transferred from the user's working Hyperion/Sentinel project. The user explicitly confirmed permission to publish the Sentinel-contributed backend, discovery and risk-scoring code in this repository. This records authorization supplied by the project owner; it does not assign third-party copyright or invent an open-source license.

Useful original modules remain in backend/main.py, Database_edit/, database/, security_engine/ and contracts/. The integrated entry point is backend/app.py. Root requirements.txt is the integrated platform dependency manifest; backend/requirements.txt belongs to the original LLM gateway.

The original repository already tracked Database_edit/database/gateway.db and four Python bytecode files. The database contained the three mock users defined by its seed script and two example audit rows; no credential columns were present. Those files are removed from the feature branch index while their local files are preserved. Their prior Git history remains, as requested. Removal from the current tree is not history erasure.

Source excludes local traffic databases, dependency directories, build products, caches, logs and repair backups. Operational screenshots containing historical telemetry are not transferred for publication. Marketing screenshots are original generated application captures. The WebGL sculpture, mark and UI are original code; no assets were copied from the visual-reference websites.

Space Grotesk and Inter are referenced from Google Fonts, with system fallbacks; no proprietary font files are bundled. Frontend third-party package licenses remain with the dependencies listed in package-lock.json. Do not imply this repository grants rights beyond its contributors' authorization and those dependencies' licenses.
