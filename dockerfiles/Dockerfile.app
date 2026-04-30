# Stage 1: Build React frontend
FROM node:20-slim AS frontend
WORKDIR /frontend
COPY app/frontend/package.json app/frontend/package-lock.json* ./
RUN npm install --include=optional \
    && (node -e "require('rollup')" || ( \
      ROLLUP_VERSION=$(node -p "require('./node_modules/rollup/package.json').version") \
      && ARCH=$(node -p "process.arch === 'arm64' ? 'arm64' : process.arch === 'x64' ? 'x64' : process.arch") \
      && npm install --no-save --include=optional "@rollup/rollup-linux-${ARCH}-gnu@${ROLLUP_VERSION}" \
    ))
COPY app/frontend/ ./
RUN rm -rf src/shared
COPY shared/components/ ./src/shared/
RUN npm run build

# Stage 2: FastAPI + serve static build
FROM python:3.13-slim
WORKDIR /app

RUN pip install --no-cache-dir \
    uvicorn \
    fastapi \
    sqlalchemy \
    psycopg2-binary \
    requests

COPY shared/ /app/shared/
COPY app/ /app/app/
COPY --from=frontend /frontend/dist /app/app/frontend/dist

EXPOSE 8030

HEALTHCHECK --interval=5s --timeout=3s --start-period=30s --retries=60 \
  CMD python -c "import requests; requests.get('http://localhost:8030/health').raise_for_status()"

CMD ["uvicorn", "app.server:app", "--host", "0.0.0.0", "--port", "8030"]
