const repl = require("repl")
const fs = require("fs");
const peerId = require("peer-id");
const { pipe } = require("it-pipe")
const Libp2p = require("libp2p");
const TCP = require("libp2p-tcp");
const WS = require("libp2p-websockets")
const mplex = require('libp2p-mplex')
const { NOISE } = require("libp2p-noise");
const MDNS = require("libp2p-mdns")
let peerStreams = [];
const getPeerId = async () => {
    let idListener = null
    if (!fs.existsSync("config.json")) {
        idListener = await peerId.create({ bits: "2048", keyType: "RSA" })
        fs.writeFileSync("config.json", JSON.stringify(idListener.toJSON()))
    }
    idListener = JSON.parse(fs.readFileSync("config.json").toString())
    return peerId.createFromJSON(idListener)
}

const addPeer = async (node, addr) => {
    try {
        const connectNode = await node.dial(addr)
        return connectNode
    } catch (err) {
        console.log(err)
    }
}

const removePeer = async (peer) => peer.close()

const sendMsg = async (peer, msg) => {
    try{
        const {stream} = await peer.newStream("/chat")
        await pipe(msg, stream)
        stream.close()
    }catch(err){
        console.log(err.message)
    }
}

(async () => {
    const peerId = await getPeerId()
    const node = await Libp2p.create({
        peerId,
        addresses: { listen: ['/ip4/0.0.0.0/tcp/4002'] },
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
        console.log(`From peer: ${connection.remotePeer.toB58String()}`)
        await pipe(stream, async (src) => {
            try {
                for await (let msg of src) {
                    console.log(msg.toString())
                }
            } catch (err) {
                console.log(err.message)
            }
        })
    })

    node.connectionManager.on("peer:connect", (connection) => {
        peerStreams.push(connection)
        console.log('connected to: ', connection.remotePeer.toB58String())
    })
    node.connectionManager.on("peer:disconnect", (connection) => console.log("disconnect", connection.remotePeer.toB58String()))
    // node.on("peer:discovery", (peer) => console.log('Discovered:', peer))
    await node.start()
    console.log('is listening:', node.isStarted())
    node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
    const r = repl.start()
    r.context["node"] = node
    r.context["peers"] = peerStreams
    r.context["addNode"] = (addr) => addPeer(node, addr)
    r.context["removeNode"] = removePeer
    r.context["send"] = sendMsg
})()
