#!/bin/sh
set -e

IMAGE="budget-app"
PORT="8083"

case "$1" in
  build)
    docker build -t "$IMAGE" .
    ;;
  run)
    docker run --rm -p "$PORT:$PORT" --name "$IMAGE" "$IMAGE"
    ;;
  stop)
    docker stop "$IMAGE"
    ;;
  *)
    echo "Usage: $0 {build|run|stop}"
    exit 1
    ;;
esac
