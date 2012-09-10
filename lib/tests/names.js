var Util    = require('util'),
    Unpack  = require('../unpack.js'),
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

var unpack  = new Unpack( buf ),
    offset, res;

offset = unpack.offset = 20;
res    = unpack.domainName();
console.log("name @%d [ %j ]", offset, res);

offset = unpack.offset = 40;
offset = unpack.offset;
res    = unpack.domainName();
console.log("name @%d [ %j ]", offset, res);

offset = unpack.offset = 64;
res    = unpack.domainName();
console.log("name @%d [ %j ]", offset, res);

offset = unpack.offset = 92;
res    = unpack.domainName();
console.log("name @%d [ %j ]", offset, res);
