#!/bin/sh
set -e
echo 'Entrypoint script'
cd /usr/src/app

# blank config, use defaults
test -e config.json || cat <<EOF > config.json
{
}
EOF

node dist/src/index.js --inspect
