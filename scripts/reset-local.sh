#!/usr/bin/env bash
set -euo pipefail

# Stop containers
echo "1. Stop containers"
docker stop $(docker ps -aq)

echo "2. RM containers"
docker rm $(docker ps -aq)

echo "3. RM vlumes"
docker volume rm $(docker volume ls | grep -v "VOLUME" | awk '{print $2}')

echo "Done"
