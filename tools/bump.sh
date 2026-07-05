#!/bin/sh
# Release version bump: updates VERSION in ui.js and every ?v= cache-bust
# (index.html script/style tags, styles.css guide-image urls, worker.js importScripts).
# Usage: tools/bump.sh 1.17.0   — then add a CHANGELOG entry in ui.js by hand.
set -e
cd "$(dirname "$0")/.."
old=$(grep -o "VERSION = '[^']*'" ui.js | cut -d"'" -f2)
new=$1
if [ -z "$new" ]; then echo "usage: tools/bump.sh <version>   (current: $old)"; exit 1; fi
sed -i '' "s/VERSION = '$old'/VERSION = '$new'/" ui.js
sed -i '' "s/?v=$old/?v=$new/g" index.html styles.css worker.js
echo "bumped $old -> $new — now add a CHANGELOG entry in ui.js"
