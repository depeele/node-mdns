var Util    = require('util'),
    Utils   = require('../utils.js'),
    Unpack  = require('../unpack.js'),
    Pack    = require('../pack.js'),
    Header  = require('../header.js'),

    data    = [
        /* Header       0x00 - 0x0b
         *  id= 2,  qr= 1, opcode= 0, aa= 1, tc= 0, rd= 1, ra= 1, z= 0
         *                      qdCount= 1, anCount= 3,
         *  nsCount= 6, arCount= 6
         */
        0x00, 0x02, 0x85, 0x80, 0x00, 0x01, 0x00, 0x03,     // 0x00 - 0x07
        0x00, 0x06, 0x00, 0x06                              // 0x08 - 0x0b
    ];

/*****************************************************************************
 * Unpack test
 *
 */
console.log("--------------------------------------------------------------");
var unpack  = new Unpack( new Buffer( data ) ),
    header  = new Header( null, unpack );

console.log("Unpack Header from %d bytes of raw data:", header.consumed);
console.log("Header:\n%s", Util.inspect(header, false, 20));

/*****************************************************************************
 * Pack test
 *
 */
console.log("--------------------------------------------------------------");
var pack    = new Pack( new Buffer( 512 ) );

header.pack( pack );

console.log("Packed Header (%d bytes):\n%s",
            header.produced, Utils.buf2hex(pack.buf, {
                                            length:     header.produced,
                                            octetsPer:  16
                             }));

if (header.produced !== data.length)
{
    console.log("*** Pack error: length %d != expected %d",
                header.produced, data.length);
    process.exit(-1);
}

var diff    = 0,
    buf     = pack.buf;
for (var idex = 0, len = data.length; idex < len; idex++)
{
    if (buf[idex] !== data[idex])
    {
        diff++;
        console.log("*** Pack error: @ %d: %d != expected %d",
                    idex, buf[idex], data[idex]);

        if (diff > 8)   { break; }
    }
}

if (diff === 0)
{
    console.log(">>> packed buffer matches original source");
}
