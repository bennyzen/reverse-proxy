/*
TODO
- handle ports other than 80 and 443
*/

const net = require('net')
const parse = require('http-message-parser')
// const clui = require('clui')
// const chalk = require('chalk')
// const figures, { replaceSymbols, mainSymbols } = require('figures')

const server = net.createServer()

const IP = '0.0.0.0'
const PORT = 8080

server.on('connection', async (clientSock)=>{
    await server.getConnections((err, count)=>{
        console.log(err ? err : `\n->o Client #${count} connected`)
    })
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

        console.log(`->o Client asking for ${host} on port ${port}`)
    
        // // serverSock (from proxy to destination)
        let serverSock = net.createConnection({ host, port },
            () => {
                console.log('o-> socket to destination established')
            }
        )

        serverSock.on('lookup',(err, address, family, host)=>{
            // check for 0.0.0.0 as DNS answer (no resolution or blocked)
            if (address == '0.0.0.0') {
                console.log(`DNS resolution for ${host} not possible. Exiting`)
                serverSock.end()
                return
            }
            console.log(err ? 
                `o-> DNSLookup Error ${err}` : 
                `o-> DNS Lookup ${host} over IPv${family} resolves to ${address}`
            )
        })

        serverSock.on('error',err=>{
            console.log('o-> serverSock',err)
        })

        clientSock.on('error', (err)=>{
            console.log('->o clientSock Error: ', err)
        })

        serverSock.on('end', ()=>{
            console.log('serverSock end')
        })
    
        // asking
        if (isTLS) {
            clientSock.write('HTTP/1.1 200 OK\r\n\n')
            console.log('o-> using HTTPS')
        } else {
            serverSock.write(data)
            console.log('o-> using HTTP')
        }

        clientSock.on('drain',()=>{
            console.log('<-o clientSock drained')
        })

        serverSock.on('drain',()=>{
            console.log('o<- serverSock drained')
        })

        // piping answers
        clientSock.pipe(serverSock)
        serverSock.pipe(clientSock)
    })
})

server.on('close', ()=>{
    console.log('Client disconnected')
})

server.on('error', (err)=>{
    console.log('An error has occurred', err)
})

server.listen({ host: IP, port: PORT },
    ()=>console.log(`Server listening on ${IP}:${PORT}`)
)
