var Util    = require('util'),
    Utils   = require('../utils.js'),
    Unpack  = require('../unpack.js'),
    Pack    = require('../pack.js'),
    RR      = require('../rr.js'),
    RData   = require('../rdata.js'),

    rr      = new RR(),
    nRecs   = 3,
    offset  = 0,
    data    = [
        // RData
        0x00, 0x19, 0x04, 0x70, 0x6F, 0x70, 0x64, 0x04,
        0x62, 0x65, 0x73, 0x74, 0x02, 0x69, 0x78, 0x06,
        0x6E, 0x65, 0x74, 0x63, 0x6F, 0x6D, 0x03, 0x63,
        0x6F, 0x6D, 0x00
    ];

rr.type = 2;

// Unpack test
console.log("---------------------------------------------------------------");
var unpack      = new Unpack( new Buffer( data ), offset );
    rdata       = new RData( rr, unpack ),
    targetLen   = rdata.consumed;
console.log("Unpack RData from %d bytes of raw data:\n%s",
            rdata.consumed,
            Utils.buf2hex(unpack.buf, offset, rdata.consumed, 16));
console.log("RData:\n%s", Util.inspect(rdata, false, 20));

offset += targetLen;

// Pack test
console.log("---------------------------------------------------------------");
var pack    = new Pack( new Buffer( data.length ) );
rdata.pack( pack );

console.log("Packed RData (%d bytes):\n%s",
            rdata.produced,
            Utils.buf2hex(pack.buf, 0, rdata.produced, 16));

if (rdata.produced !== targetLen)
{
    console.log("*** Pack error: length %d != expected %d",
                rdata.produced, targetLen);
    process.exit(-1);
}

var diff    = 0,
    buf     = pack.buf;
for (var jdex = 0, len = targetLen; jdex < len; jdex++)
{
    if (buf[jdex] !== data[jdex])
    {
        diff++;
        console.log("*** Pack error: @ %d: %d != expected %d",
                    jdex, buf[jdex], data[jdex]);

        if (diff > 8)   { break; }
    }
}

if (diff === 0)
{
    console.log(">>> packed buffer matches original source");
}
