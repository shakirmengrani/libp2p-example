## Talking with multiple nodes with Lbp2p
While using file `libp2p.js` you can simulate how to connect to another PC for talking him / her without any intermediate server.

How to execute

```
$ npm i
$ node libp2p
```
Above line will create a config file for remaining you PC / Node for next time.
After this command you will enter `REPL` mode

`> ` addNode("/ip4/x.x.x.x/:port/:peerId")

`> ` peers // returns all peers that you have to connected

`> ` send(peers[0], ["Hello"]) 

This `Hello` messgae will recevies on peers -> 0 index PC / Node
Same as run the above command on peers -> 0 index PC / Node then you will receive a message whatever you entered.