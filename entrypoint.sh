#!/bin/sh
set -e
echo 'Entrypoint script'
cd /usr/src/app

# blank config, use defaults
cp /etc/sponsorblock/config.json . || cat <<EOF > config.json
{
}
EOF

node dist/index.js