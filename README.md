# reverse-proxy
A simple reverse-proxy written in NodeJS with a minimalistic terminal UI.

![image](https://user-images.githubusercontent.com/13304/133279854-629690fc-b802-4135-b033-86761e8c866c.png)

## Usage
```
yarn
yarn start
```

Now point your browser or your OS proxy settings to use the running reverse-proxy. Set `localhost` as address and port `8080` as proxy location. Now use your browser and watch the UI for realtime stats.

## GeoIP
To get geoIP working, you need to have a local copy of a geo2ip-location database. To get a local copy (~200MB) for free , perform these steps:
- Create an account on [maxmind.com](https://www.maxmind.com) and obtain a free license key
- Then `cd node_modules/geoip-lite` and run `yarn run updatedb license_key=YOUR_LICENSE_KEY`
- Now be patient, as processing all that data will take a while

