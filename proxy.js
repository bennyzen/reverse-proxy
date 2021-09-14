/*
TODO
- handle ports other than 80 and 443
*/

const net = require('net')
const parse = require('http-message-parser')
const geoip = require('geoip-lite')

let totalConnections = 0
let socketErrorsServer = 0
let socketErrorsClient = 0
let lookupsTotal = 0
let lookupErrors = 0
let lookupsGeoIp = 0

// ui
const blessed = require('blessed')
const contrib = require('blessed-contrib')
// const chalk = require('chalk')
// const figures, { replaceSymbols, mainSymbols } = require('figures')
const screen = blessed.screen({
    label: 'NodeReverseProxy',
})
let grid = new contrib.grid({
    rows: 10,
    cols: 10,
    screen
})
let stats = grid.set(0,0,5,5, contrib.table, {
    label: 'Stats',
    keys: false,
    interactive: false,
    fg: 'white',
    columnWidth: [20,10],
})
let map = grid.set(0,5,5,5, contrib.map, {
    label: 'Server Locations',
})
let logs = grid.set(5,0,5,10, contrib.log, {
    label: 'Logs',
    fg: 'white',
    selectedFg: 'white',
})
screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
})
screen.render()


const server = net.createServer()

const IP = '0.0.0.0'
const PORT = 8080

server.on('connection', async (clientSock)=>{
    totalConnections++
    updateStats()
    // client Sock (from client to proxy)
    clientSock.once('data', (data)=>{
        const headers = parse(data)
        // console.log(headers)
        
        // Remember: http uses GET, HTTPS uses CONNECT
        let isTLS = headers.method == 'CONNECT'
        let host, port, url
        isTLS ? port = 443 : port = 80
        isTLS ? host = 
            `${headers.url.split(':')[0]}` : 
            host = headers.headers.Host

        logs.log(`➤♡ Client asking for ${host} on port ${port}`)
    
        // // serverSock (from proxy to destination)
        let serverSock = net.createConnection({ host, port },
            () => {
                logs.log('♡➤ socket to destination established')
            }
        )

        serverSock.on('lookup',(err, address, family, host)=>{
            lookupsTotal++
            // check for 0.0.0.0 as DNS answer (no resolution or blocked)
            if (address == '0.0.0.0') {
                lookupErrors++
                logs.log(`DNS resolution for ${host} blocked. Ignoring ...`)
                serverSock.end()
                return
            }
            geoIp(address)
            logs.log(err ? 
                `♡➤ DNSLookup Error ${err}` :
                `♡➤ DNS Lookup ${host} over IPv${family} resolves to ${address}`
            )
        })

        serverSock.on('error',err=>{
            logs.log('♡➤ serverSock',err)
        })

        clientSock.on('error', (err)=>{
            logs.log('-♡o clientSock Error: ', err)
        })

        serverSock.on('end', ()=>{
            logs.log('serverSock end')
        })
    
        // asking
        if (isTLS) {
            clientSock.write('HTTP/1.1 200 OK\r\n\n')
            logs.log('♡➤ using HTTPS')
        } else {
            serverSock.write(data)
            logs.log('♡➤ using HTTP')
        }

        // clientSock.on('drain',()=>{
        //     console.log('<-o clientSock drained')
        // })

        serverSock.on('drain',()=>{
            logs.log('♡◀ serverSock drained')
        })

        // piping answers
        clientSock.pipe(serverSock)
        serverSock.pipe(clientSock)
    })
})

server.on('close', ()=>{
    logs.log('Client disconnected')
})

server.on('error', (err)=>{
    socketErrorsServer++
    logs.log('An error has occurred', err)
})

server.listen({ host: IP, port: PORT }, () =>{
    socketErrorsClient++
    logs.log(`Server listening on ${IP}:${PORT}`)
})

async function updateStats() {
    await server.getConnections((err, count) => {
        logs.log(err ? err : `\n➤♡ Client #${count} connected`)
        let memory = process.memoryUsage().heapUsed / 1024 / 1024
        stats.setData({
            headers: ['Property','Value'],
            data: [
                ['Active connections', count],
                ['Total connections', totalConnections],
                ['Memory usage', `${Math.round(memory*100)/100} MB`],
                ['Server socket err', socketErrorsServer],
                ['Client socket err', socketErrorsClient],
                ['DNS Lookups', lookupsTotal],
                ['DNS Failures', lookupErrors],
                ['GeoIP Lookups', lookupsGeoIp],
            ],
        })
    })
}

function geoIp(ip) {
    let pos = geoip.lookup(ip)
    // only mark on map if we have coords
    if (!!pos && !!pos.ll) {
        lookupsGeoIp++
        map.addMarker({
            lon: pos.ll[1],
            lat: pos.ll[0],
            color: 'white',
            char: '★',
        })
        logs.log(`♡  GeoIP ${ip} in ${pos.region} ${pos.country} ${pos.city}`)
    }
}