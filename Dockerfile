
# Stage 1: Build React frontend
FROM node:24-alpine AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN node scripts/exportReplay.mjs

# Stage 2: Run FastAPI and serve React
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY --from=frontend /app/backend/data/ ./backend/data/
COPY --from=frontend /app/dist ./dist

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--proxy-headers"]
