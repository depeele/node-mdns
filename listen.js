var Dgram   = require('dgram'),
    Mdns    = require('./lib/mdns'),
    Utils   = require('./lib/utils'),
    client  = Dgram.createSocket('udp4');

client.on('listening', function() {
    var ainfo   = client.address();

    console.log("listening on %s:%s", ainfo.address, ainfo.port);
});
client.on('error', function(e) {
    console.log("*** Error: %s", e);
});
client.on('close', function() {
    console.log("*** Close");
});

client.on('message', function(msg, rinfo) {
    var message = new Mdns.Message(msg);

    console.log(  "========================================================\n"
                + "message from %s:%s: (%d bytes)\n"
                + "--------------------------------------------------------\n"
                + "%s\n"
                + "--------------------------------------------------------\n"
                + "%d bytes as raw data:\n"
                + "%s\n",
                rinfo.address, rinfo.port, msg.length,
                message,
                msg.length,
                Utils.buf2hex(msg, {octetsPer: 16, ascii: true}));
});

//client.bind( Mdns.config.port, Mdns.config.ipv4, function() {
client.bind( Mdns.config.port, null, function() {
    //client.setBroadcast(true);

    client.setMulticastTTL( Mdns.config.ttl );
    client.addMembership( Mdns.config.ipv4 );
});
