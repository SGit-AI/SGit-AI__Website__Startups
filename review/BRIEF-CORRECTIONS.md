# Where the review brief was wrong for this repository, and what was done instead

- **2026-10-20.** The brief asks for a parser-derived `methods.json` and `classes.json`. This repository has one Python module (`admin/build/build.py`, which will be split as it grows), one Python tool, one release script and four JavaScript files. The derived layer is files and surfaces; methods and classes are added when there are enough of either to need a parser.
- **2026-10-20.** The brief asks for the navigator before the first source file. It was not built in the first session; the build writes a page from the JSON instead. The engineer's issue 001.
- **2026-10-20.** The brief's `freshness.py` is a check in `admin/build/validate.js` here (the hash of every source file against `graph/files.json`), so the site has one gate rather than two.
