[![Stories in Ready](https://badge.waffle.io/TNOCS/wodk.png?label=ready&title=Ready)](https://waffle.io/TNOCS/wodk)
# wodk
Woningen op de Kaart


## install

Prerequisites: 
* NodeJS v8.12.0
* npm 6.4.1 (gets installed with NodeJS)
```
git clone https://github.com/tnocs/wodk
git checkout design-update
npm i
npm run typings
cd public
bower i
cd ..
npm run tsc
```

Now run the server with 
```
node server.js
```
and browse to [http://localhost:3002/](http://localhost:3002/)