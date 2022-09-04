FROM node:16

WORKDIR /GIFproject/app

# Install app dependencies
COPY package.json .

RUN npm install 

#bundle app source
COPY . .

EXPOSE 8888

CMD [ "node", "app.js" ]