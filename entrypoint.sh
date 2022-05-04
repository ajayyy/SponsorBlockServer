#!/bin/sh
set -e
echo 'Entrypoint script'
cd /usr/src/app

# blank config, use defaults
cat <<EOF > config.json
{
}
EOF

node dist/src/index.js