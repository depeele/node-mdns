var Util    = require('util'),
    Utils   = require('../utils.js'),
    Unpack  = require('../unpack.js'),
    Pack    = require('../pack.js').Pack,
    Question= require('../question.js'),

    data    = [
        // Question
        0x04, 0x70, 0x6F, 0x70, 0x64, 0x02, 0x69, 0x78,
        0x06, 0x6E, 0x65, 0x74, 0x63, 0x6F, 0x6D, 0x03,
        0x63, 0x6F, 0x6D, 0x00, 0x00, 0x01, 0x00, 0x01
    ];

/*****************************************************************************
 * Unpack test
 *
 */
console.log("--------------------------------------------------------------");
var unpack      = new Unpack( new Buffer( data ) ),
    question    = new Question( null, unpack );

console.log("Unpack Question from %d bytes of raw data:", question.consumed);
console.log("Question:\n%s", Util.inspect(question, false, 20));

/*****************************************************************************
 * Pack test
 *
 */
console.log("--------------------------------------------------------------");
var pack    = new Pack( new Buffer( 512 ) );

question.pack( pack );

console.log("Packed Question (%d bytes):\n%s",
            question.produced,
            Utils.buf2hex(pack.buf, {
                length:     question.produced,
                octetsPer:  16
            }));

if (question.produced !== data.length)
{
    console.log("*** Pack error: length %d != expected %d",
                question.produced, data.length);
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
