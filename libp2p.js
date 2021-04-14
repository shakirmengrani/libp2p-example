const fs = require("fs");
const peerId = require("peer-id");
const { createInterface } = require("readline");
const { pipe } = require("it-pipe")
const Libp2p = require("libp2p");
const TCP = require("libp2p-tcp");
const WS = require("libp2p-websockets")
const mplex = require('libp2p-mplex')
const { NOISE } = require("libp2p-noise");
const MDNS = require("libp2p-mdns")

const getPeerId = async () => {
    let idListener = null
    if (!fs.existsSync("config.json")) {
        idListener = await peerId.create({ bits: "2048", keyType: "secp256k1" })
        fs.writeFileSync("config.json", JSON.stringify(idListener.toJSON()))
    }
    idListener = JSON.parse(fs.readFileSync("config.json").toString())
    return peerId.createFromJSON(idListener)
}

(async () => {
    const peerId = await getPeerId()
    const node = await Libp2p.create({
        peerId,
        addresses: { listen: ['/ip4/0.0.0.0/tcp/0'] },
        modules: {
            transport: [TCP, WS],
            streamMuxer: [mplex],
            connEncryption: [NOISE],
            peerDiscovery: [MDNS]
        },
        config: {
            peerDiscovery: {
                mdns: {
                    serviceTag: "hello",
                    interval: 20e3,
                    enabled: true
                }
            }
        }
    })
    node.handle("/chat", async ({ connection, stream, protocol }) => {
        console.log("connection", connection.remotePeer.toB58String())
        pipe(stream, async (src) => {
            for await (let msg of src) {
                console.log(msg.toString())
            }
        })
    })

    node.connectionManager.on("peer:connect", (connection) => console.log('connected to: ', connection.remotePeer.toB58String()))
    node.on("peer:discovery", (peer) => console.log('Discovered:', peer.id.toB58String()))
    await node.start()
    console.log('listening on:', node.isStarted())
    node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
    let quest = createInterface({ input: process.stdin, output: process.stdout })
    quest.question("Enter addr ", async (addr) => {
        try {
            const anotherNode = await node.dialProtocol(addr, "/chat")
            await pipe(["Own protocol"], anotherNode.stream)
            quest.close()
        } catch (err) {
            console.log(err.message)
        }
    })
})()
