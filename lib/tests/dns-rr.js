var Util    = require('util'),
    Utils   = require('../utils.js'),
    Unpack  = require('../unpack.js'),
    Pack    = require('../pack.js'),
    RR      = require('../rr.js'),

    nRecs   = 4,
    offset  = 0x0c,
    data    = [
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,

        /* RR #1 (cobbled together from an original question)
        +-- 0x0c: popd.ix.netcom.com
        |                             +-- 0x11: ix.netcom.com
        v                             v                     */
        0x04, 0x70, 0x6F, 0x70, 0x64, 0x02, 0x69, 0x78,     // 0x0c - 0x13
        0x06, 0x6E, 0x65, 0x74, 0x63, 0x6F, 0x6D, 0x03,     // 0x14 - 0x1b
        0x63, 0x6F, 0x6D, 0x00, 0x00, 0x05, 0x00, 0x01,     // 0x1c - 0x23
        0x00, 0x00, 0x00, 0x3C, 0x00, 0x0f, 0x02, 0x68,     // 0x24 - 0x2b
        0x78, 0x06, 0x6F, 0x65, 0x74, 0x63, 0x6F, 0x6D,     // 0x2c - 0x33
        0x03, 0x62, 0x6F, 0x6D, 0x00,                       // 0x34 - 0x38

        /* RR #2
        ^
        +-- 0x0c: (popd.ix.netcom.com)                      */
        0xC0, 0x0C, 0x00, 0x05, 0x00, 0x01, 0x00, 0x00,     // 0x39 - 0x40
                             /* +-- 0x45: popd.best.ix.netcom.com
                                v                           */
        0x00, 0x3C, 0x00, 0x0c, 0x04, 0x70, 0x6F, 0x70,     // 0x41 - 0x48
        0x64, 0x04, 0x62, 0x65, 0x73, 0x74, 0xc0, 0x11,     // 0x49 - 0x50

        /* RR #3
        ^
        +-- 0x45: (popd.best.ix.netcom.com)                  */
        0xC0, 0x45, 0x00, 0x05, 0x00, 0x01, 0x00, 0x00,     // 0x51 - 0x58
                            /*  +-- 0x5d: ix6.ix.netcom.com
                                v                           */
        0x00, 0x00, 0x00, 0x06, 0x03, 0x69, 0x78, 0x36,     /* 0x59 - 0x60
        ^
        +-- 0x3a: SHOULD be 0x11 (ix.netcom.com) */
        0xC0, 0x11,                                         // 0x61 - 0x62

        /* RR #4
        ^
        +-- 0x5d: (ix6.ix.netcom.com)                       */
        0xC0, 0x5d, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,     // 0x62 - 0x55
        0x1C, 0x20, 0x00, 0x04, 0xC7, 0xB6, 0x78, 0x06      // 0x56 - 0x5e
    ];

/***************************************************************************
 * Unpack test
 *
 */
var unpack  = new Unpack( new Buffer( data ),             offset ),
    pack    = new Pack(   new Buffer( data.length + 10 ), offset );

for (var idex = 0; idex < nRecs; idex++)
{
    console.log("# %d @ %s ------------------------------------------------",
                idex+1, Utils.int2hex(offset, 2));

    // Unpack test
    var rr          = new RR( null, unpack ),
        targetLen   = rr.consumed;

    console.log("Unpack RR from %d bytes of raw data:\n%s",
                rr.consumed,
                Utils.buf2hex(unpack.buf, {
                    offset:     offset,
                    length:     rr.consumed,
                    octetsPer:  16
                }));
    console.log("RR:\n%s", Util.inspect(rr, false, 20));
    console.log("----------------------------------");

    // Pack test
    rr.pack( pack );

    console.log("Packed RR (%d bytes):\n%s",
                rr.produced,
                Utils.buf2hex(pack.buf, {
                    offset:     offset,
                    length:     rr.produced,
                    octetsPer:  16
                }));

    if (rr.produced !== targetLen)
    {
        console.log("*** Pack error: length %d != expected %d",
                    rr.produced, targetLen);
        continue;
    }

    var diff    = 0,
        buf     = pack.buf;
    for (var jdex = offset, end = offset + targetLen; jdex < end; jdex++)
    {
        if (buf[jdex] !== data[jdex])
        {
            diff++;
            console.log("*** Pack error: @ %s: %s != expected %s",
                        Utils.int2hex(jdex, 2),
                        Utils.int2hex(buf[jdex]),
                        Utils.int2hex(data[jdex]));

            if (diff > 8)   { break; }
        }
    }

    if (diff === 0)
    {
        console.log(">>> packed buffer matches original source");
    }

    // Move our offset
    offset += targetLen;
}
