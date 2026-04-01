FROM node:18

WORKDIR /app
COPY . .

# backend
WORKDIR /app/backend
RUN npm install

# frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

WORKDIR /app

EXPOSE 10000

CMD ["sh", "-c", "cd backend && node index.js & cd frontend && npm run start"]
