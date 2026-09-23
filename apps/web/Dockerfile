FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY tsconfig.json next-env.d.ts next.config.ts ./
COPY app ./app

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
