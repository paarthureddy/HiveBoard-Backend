FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Expose port (Matches the PORT in docker-compose.yml)
EXPOSE 5000

# Start command
CMD ["npm", "start"]
