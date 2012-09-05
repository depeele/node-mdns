var Util    = require('util'),
    Utils   = require('../utils.js'),
    buf     = new Buffer( [ 0,0,0,0,0, 0,0,0,0,0,
                            0,0,0,0,0, 0,0,0,0,0,

                            // offset 20
                            1, 70,                  // F
                            3, 73, 83, 73,          // ISI
                            4, 65, 82, 80, 65,      // ARPA
                            0,

                            // offset 32
                            0,0,0,0,0, 0,0,0,

                            // offset 40
                            3, 70, 79, 79,          // FOO
                            0xC0, 20,   // pointer + offset 20

                            // offset 46
                            0,0,0,0,0, 0,0,0,0,0,
                            0,0,0,0,0, 0,0,0,

                            // offset 64
                            0xC0, 26,   // pointer + offset 26

                            // offset 66
                            0,0,0,0,0, 0,0,0,0,0,
                            0,0,0,0,0, 0,0,0,0,0,
                            0,0,0,0,0, 0,

                            // offset 92

                            0 ] );

//console.log("buf[ %s ]", buf);

/*
var hex = '0123456789abcdef';
for (var idex = 0; idex < buf.length; idex++)
{
    var octet   = buf[idex],
        nibbles = [ (octet >> 4) & 0x0F, octet & 0x0F ];

    //process.stdout.write( Util.format("%d", octet) );
    process.stdout.write( Util.format("0x%s%s ",
                                      hex[ nibbles[0] ], hex[ nibbles[1] ]) );
}
process.stdout.write("\n");
// */


var map = {}, offset, res;

offset = 20;
res    = Utils.parseName(buf, offset, map);
console.log("name @%d [ %j ]", offset, res);

offset = 40;
res    = Utils.parseName(buf, offset, map);
console.log("name @%d [ %j ]", offset, res);

offset = 64;
res    = Utils.parseName(buf, offset, map);
console.log("name @%d [ %j ]", offset, res);

offset = 92;
res    = Utils.parseName(buf, offset, map);
console.log("name @%d [ %j ]", offset, res);
