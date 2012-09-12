var Util    = require('util'),
    Utils   = require('../utils.js'),
    Message = require('../message.js'),

    data    = [
        // Header
        0xf3, 0x49, 0x81, 0x80, 0x00, 0x01, 0x00, 0x01,
        0x00, 0x02, 0x00, 0x00,
        
        // Question
        0x04, 0x70, 0x6f, 0x70, 0x64, 0x02, 0x69, 0x78,
        0x06, 0x6e, 0x65, 0x74, 0x63, 0x6f, 0x6d, 0x03,
        0x63, 0x6f, 0x6d, 0x00, 0x00, 0xff, 0x00, 0x01,

        // Answer
        0xc0, 0x0c, 0x00, 0x0f, 0x00, 0x01, 0x00, 0x00,
        0x03, 0x10, 0x00, 0x18, 0x00, 0x0a, 0x06, 0x6e,
        0x6f, 0x6d, 0x61, 0x69, 0x6c, 0x09, 0x65, 0x61,
        0x72, 0x74, 0x68, 0x6c, 0x69, 0x6e, 0x6b, 0x03,
        0x6e, 0x65, 0x74, 0x00, 0xc0, 0x11, 0x00, 0x02,
        0x00, 0x01, 0x00, 0x00, 0x03, 0x10, 0x00, 0x0b,
        0x08, 0x73, 0x63, 0x72, 0x61, 0x74, 0x63, 0x68,
        0x79, 0xc0, 0x39, 0xc0, 0x11, 0x00, 0x02, 0x00,
        0x01, 0x00, 0x00, 0x03, 0x10, 0x00, 0x08, 0x05,
        0x69, 0x74, 0x63, 0x68, 0x79, 0xc0, 0x39  
 
    ];

/*****************************************************************************
 * Unpack test
 *
 */
console.log("--------------------------------------------------------------");
var rBuf    = new Buffer( data ),
    message = new Message( {unpack:rBuf} );

console.log("Unpack mesage from %d bytes of raw data:", message.consumed);
console.log("message:\n%s", Util.inspect(message, false, 20));

//process.exit(0);

/*****************************************************************************
 * Pack test
 *
 */
console.log("--------------------------------------------------------------");
var wBuf    = new Buffer( 4096 );

message.pack(wBuf);

console.log("Packed message (%d bytes):\n%s",
            message.produced, Utils.buf2hex(wBuf, {
                                            length:     message.produced,
                                            octetsPer:  16
                             }));

if (message.produced !== data.length)
{
    console.log("*** Pack error: length %d != expected %d",
                message.produced, data.length);
    //process.exit(-1);
}

var diff    = 0;
for (var idex = 0, len = data.length; idex < len; idex++)
{
    if (wBuf[idex] !== data[idex])
    {
        diff++;
        console.log("*** Pack error: @ %s: %s != expected %s",
                    Utils.int2hex(idex, 2),
                    Utils.int2hex(wBuf[idex]),
                    Utils.int2hex(data[idex]));

        if (diff > 8)   { break; }
    }
}

if (diff === 0)
{
    console.log(">>> packed buffer matches original source");
}
else
{
    if (diff > 8)   {console.log("*** ..."); }

    console.log("*** packed buffer mismatch.");
    console.log("Original source (%d bytes):\n%s",
                rBuf.length, Utils.buf2hex(rBuf, {
                                            length:     rbuf.length,
                                            octetsPer:  16
                             }));
}
