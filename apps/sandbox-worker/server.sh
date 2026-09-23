#!/bin/sh
set -eu
while true; do
  nc -l -p 8010 -e /app/run.sh || true
done
