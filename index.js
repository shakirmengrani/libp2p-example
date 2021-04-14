const { createInterface } = require("readline")
const IPFS = require("ipfs")
const TOPIC = "topic"
IPFS.create({
    repo: ".ipfs",
    relay: {
        enabled: true,
        hop: {
            enabled: true,
            active: true
        }
    },
    EXPERIMENTAL: { ipnsPubsub: true, sharding: true },
    // start: false
}).then(ipfs => {
    setInterval(() => {
        ipfs.swarm.peers().then(peer => {
            console.log("peers", peer.map(p => p.addr.toString()))    
            
        })
    }, 1000)
    // console.log("ipfs", ipfs.isOnline())
    ipfs.id().then(ii => console.log(ii))
    // let peer = createInterface({
    //     input: process.stdin,
    //     output: process.stdout
    // })
    // peer.question("Enter peer id", ans => {
    //     console.log(ans)
    //     peer.close()
    // })
    // ipfs.pubsub.subscribe(TOPIC, (msg) => {
    //     console.log({
    //         from: msg.from.toString(),
    //         data: Buffer.from(msg.data).toString()
    //     })
    // })
    // ipfs.swarm.connect()
    // ipfs.pubsub.publish(TOPIC, "asd")
})


