var Util    = require('util'),
    Utils   = require('../utils.js'),
    Message = require('../message.js'),

    expect  = [ // Header
                0x00, 0x02, 0x01, 0x00,
                0x00, 0x01, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,

                // Message
                0x04, 0x70, 0x6F, 0x70,
                0x64, 0x02, 0x69, 0x78,
                0x06, 0x6E, 0x65, 0x74,
                0x63, 0x6F, 0x6D, 0x03,
                0x63, 0x6F, 0x6D, 0x00,
                0x00, 0x01, 0x00, 0x01 ];

/*****************************************************************************
 * Creation test/pack
 *
 */
console.log("--------------------------------------------------------------");
var message = new Message( );

message.header.id = 0x02;
message.header.rd = 0x01;
message.addQuestion('popd.ix.netcom.com.', 1, 1);

console.log("Generated message: %s", message);


console.log("--------------------------------------------------------------");
var wBuf    = new Buffer( 4096 );

message.pack(wBuf);

console.log("Packed message (%d bytes):\n%s",
            message.produced, Utils.buf2hex(wBuf, {
                                            length:     message.produced,
                                            octetsPer:  16
                             }));

if (message.produced !== expect.length)
{
    console.log("*** Pack error: length %d != expected %d",
                message.produced, expect.length);
    process.exit(-1);
}

var diff    = 0;
for (var idex = 0, len = expect.length; idex < len; idex++)
{
    if (wBuf[idex] !== expect[idex])
    {
        diff++;
        console.log("*** Pack error: @ %s: %s != expected %s",
                    Utils.int2hex(idex, 2),
                    Utils.int2hex(wBuf[idex]),
                    Utils.int2hex(expect[idex]));

        if (diff > 8)   { break; }
    }
}

if (diff === 0)
{
    console.log(">>> packed buffer matches original source");
}
