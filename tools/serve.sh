#!/usr/bin/env bash
# Reinicia o vite preview (ele guarda o index.html em cache; após cada build precisa reiniciar).
cd "$(dirname "$0")/.."
for pid in $(netstat -ano 2>/dev/null | grep ":4173" | grep LISTEN | awk '{print $5}' | sort -u); do taskkill //PID "$pid" //F >/dev/null 2>&1; done
sleep 1
(npx vite preview --host --port 4173 > /tmp/preview.log 2>&1 &)
for i in $(seq 1 30); do sleep 0.5; curl -s -o /dev/null http://localhost:4173/ && break; done
curl -s http://localhost:4173/ | grep -o 'index-[A-Za-z0-9_-]*\.js'
