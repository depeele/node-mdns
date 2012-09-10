var Util    = require('util'),
    Utils   = require('../utils.js'),
    Message = require('../message.js'),

    data    = [
        0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x05, 0x5f, 0x68, 0x74,
        0x74, 0x70, 0x04, 0x5f, 0x74, 0x63, 0x70, 0x00,
        0x00, 0x01, 0x00, 0x01, 0xc0, 0x0c, 0x00, 0x1c,
        0x00, 0x01
    ];

/*****************************************************************************
 * Unpack test
 *
 */
console.log("--------------------------------------------------------------");
var rBuf    = new Buffer( data ),
    message = new Message( rBuf );

console.log("Unpack mesage from %d bytes of raw data:", message.consumed);
console.log("message:\n%s", Util.inspect(message, false, 20));

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
    process.exit(-1);
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
