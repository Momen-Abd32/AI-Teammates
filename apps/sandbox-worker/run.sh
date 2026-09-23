#!/bin/sh
set -eu
# Placeholder transport bootstrap; the production API will use this worker boundary.
printf 'HTTP/1.1 501 Not Implemented\r\nContent-Length: 0\r\n\r\n'
