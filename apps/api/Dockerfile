FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc --noEmit
EXPOSE 3001
CMD ["node","-e","require('typescript') && console.log('API source validated; use pnpm build in workspace')"]