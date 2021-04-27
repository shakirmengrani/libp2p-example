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
const Bootstrap = require('libp2p-bootstrap')
const proto = require("protobufjs")

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


const packMsg = (message, comp = "pack", type = "Output") => {
    const root = proto.loadSync("./greet.proto")
    const msg = root.lookupType(`greeter.${type}`)
    if(comp == "pack"){
        const payload = msg.create({ message })
        const isVerify = msg.verify(payload)
        if(!isVerify){
            return msg.encode(payload).finish()
        }else{
            throw new Error(isVerify)
        }
    }else{
        return msg.decode(message)
    }
}


const sendMsg = async (peer, msg) => {
    try {
        const { stream } = await peer.newStream("/chat")
        await pipe([packMsg(msg)], stream)
        stream.close()
    } catch (err) {
        console.log(err.message)
    }
}

(async () => {
    // const peerId = await getPeerId()
    const node = await Libp2p.create({
        // peerId,
        addresses: { listen: ['/ip4/0.0.0.0/tcp/4002'] },
        modules: {
            transport: [TCP, WS],
            streamMuxer: [mplex],
            connEncryption: [NOISE],
            peerDiscovery: [MDNS]
        },
        config: {
            peerDiscovery: {
                [Bootstrap.tag]: {
                    list: ['/dnsaddr/bootstrap.libp2p.io/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'],
                    enabled: true,
                    interval: 30e2
                },
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
                    for(let buf of msg["_bufs"]){
                        console.log(packMsg(buf, "unpack"))
                    }
                }
            } catch (err) {
                console.log("receiver error",err)
            }
        })
    })
    node.on('peer:discovery', function (peerId) {
        console.log('found peer: ', peerId.toB58String())
    })
    node.connectionManager.on("peer:connect", (connection) => {
        peerStreams.push({peerId: connection.remotePeer.toB58String(), connection})
        console.log('connected to: ', connection.remotePeer.toB58String())
    })
    node.connectionManager.on("peer:disconnect", (connection) => {
        peerStreams = peerStreams.filter(peer => peer.peerId !== connection.remotePeer.toB58String())
        console.log("disconnect", connection.remotePeer.toB58String())
    })
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
    r.context["createMsg"] = packMsg
})()
