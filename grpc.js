const gRPC = require("@grpc/grpc-js")
const protoLoader = require("@grpc/proto-loader")

const feature_list = require("./routes.json")

function checkFeature(point) {
    var feature;
    // Check if there is already a feature object for the given point
    for (var i = 0; i < feature_list.length; i++) {
        feature = feature_list[i];
        if (feature.location.latitude === point.latitude &&
            feature.location.longitude === point.longitude) {
            return feature;
        }
    }
    var name = '';
    feature = {
        name: name,
        location: point
    };
    return feature;
}
function getFeature(call, callback) {
    callback(null, checkFeature(call.request));
}



const pkgDef = protoLoader.loadSync("./routeGuide.proto", {keepCase: true, longs: String, enums: String, defaults: true, oneofs: true })
const RouteGuide =  gRPC.loadPackageDefinition(pkgDef).routeguide
const server = new gRPC.Server()
server.addService(RouteGuide.RouteGuide.service, {
    GetFeature: getFeature
})

server.bindAsync("0.0.0.0:9090", gRPC.ServerCredentials.createInsecure(),(err, port) => {
    if(err){
        throw new Error(err)
    }
    server.start()
    console.log(`Service is running on port ${port}`)
    const client = new RouteGuide.RouteGuide("localhost:9090", gRPC.credentials.createInsecure())
    client.GetFeature({latitude: 409146138, longitude: -746188906}, (err, feature) => {
        if(err){
            throw new Error(err)
        }
        console.log(feature)
    })
})