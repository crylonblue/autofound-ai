# Agent Docker Images

Base images for autofound.ai agent execution on Fly.io Machines.

## Images

| Image | Based On | Purpose | ~Size |
|-------|----------|---------|-------|
| `autofound-base` | Ubuntu 24.04 | All agents — Python 3.12, Node 22, git | ~350MB |
| `autofound-dev` | base | Coding agents — build-essential, gcc | ~500MB |
| `autofound-pod` | base | Pod server — Fastify on :8080, /exec, /files | ~380MB |
| `autofound-marketer` | base | Marketing agents — Playwright, pandas | ~700MB |

## Build

```bash
# Build base first (others depend on it)
docker build -t autofound-base:latest -f Dockerfile.base .
docker build -t autofound-dev:latest -f Dockerfile.dev .
docker build -t autofound-marketer:latest -f Dockerfile.marketer .
```

## Test

```bash
docker run --rm autofound-base:latest python --version    # Python 3.12.x
docker run --rm autofound-base:latest node --version       # v22.x
docker run --rm autofound-dev:latest gcc --version         # gcc 13.x
docker run --rm autofound-marketer:latest python -c "import pandas; print(pandas.__version__)"
```

## Fly.io Deployment

Images are pushed to Fly.io's registry and referenced in machine configs:

```bash
fly auth docker
docker tag autofound-base:latest registry.fly.io/autofound-agents:base
docker push registry.fly.io/autofound-agents:base
```
