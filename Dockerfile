FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm cache clean --force && \
    npm install --legacy-peer-deps --force && \
    npm ls ajv ajv-keywords 2>&1 | head -20

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
