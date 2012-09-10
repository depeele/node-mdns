var Util    = require('util'),
    Utils   = require('../utils.js'),
    Message = require('../message.js'),

    data    = [
        /*********************************************************************
         * Header       0x00 - 0x0b
         *  id= 2,  qr= 1, opcode= 0, aa= 1, tc= 0, rd= 1, ra= 1, z= 0
         *                      qdCount= 1, anCount= 3,
         *  nsCount= 6, arCount= 6
         */
        0x00, 0x02, 0x85, 0x80, 0x00, 0x01, 0x00, 0x03,     // 0x00 - 0x07
        0x00, 0x06, 0x00, 0x06,                             // 0x08 - 0x0b

        /*********************************************************************
         * Question     0x0c - 0x23     (1 record)
         *
         * 1: 0x0c - 0x23
         *    popd.ix.netcom.com, qtype= 1, qclass= 1
         *
        +- 0x0c: popd.ix.netcom.com
        v                             v- 0x11: ix.netcom.com                */
        0x04, 0x70, 0x6F, 0x70, 0x64, 0x02, 0x69, 0x78,     // 0x0c - 0x13
        0x06, 0x6E, 0x65, 0x74, 0x63, 0x6F, 0x6D, 0x03,     // 0x14 - 0x1b
        0x63, 0x6F, 0x6D, 0x00, 0x00, 0x01, 0x00, 0x01,     // 0x1c - 0x23

        /*********************************************************************
         * Answer       0x24 - 0x6a     (3 record)
         *
         * 1: 0x24 - 0x3b
         *      popd.ix.netcom.com, type= 5, class= 1, ttl= 60
         *      rdata:  .popd.best.ix.netcom.com
         *
        ^- 0x0c: (popd.ix.netcom.com)                                       */
        0xC0, 0x0C, 0x00, 0x05, 0x00, 0x01, 0x00, 0x00,     // 0x24 - 0x2b
        /*                      v- 0x30: popd.best.ix.netcom.com            */
        0x00, 0x3C, 0x00, 0x0c, 0x04, 0x70, 0x6F, 0x70,     // 0x2c - 0x33
        /*                                  ^- 0x11: (ix.netcom.com)        */
        0x64, 0x04, 0x62, 0x65, 0x73, 0x74, 0xc0, 0x11,     // 0x34 - 0x3b

        /* 2: 0x3c - 0x5d
         *      popd.best.ix.netcom.com, type= 5, class= 1, ttl= 0
         *      rdata:  .popd.best.ix.netcom.com
         *
        ^- 0x30: (popd.best.ix.netcom.com)                                  */
        0xC0, 0x30, 0x00, 0x05, 0x00, 0x01, 0x00, 0x00,     // 0x3c - 0x43
        //                      v- 0x48 ix6.ix.netcom.com
        0x00, 0x00, 0x00, 0x06, 0x03, 0x69, 0x78, 0x36,     // 0x44 - 0x4b
        /*
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11,                                         // 0x4c - 0x4d

        /* 3: 0x4e - 0x6d
         *      ix6.netcom.com, type= 1, class= 1, ttl= 7200
         *      rdata:  199.182.120.6
         *
        ^- 0x30: (popd.best.ix.netcom.com)                                  */
        0xC0, 0x48, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,     // 0x4e - 0x55
        0x1C, 0x20, 0x00, 0x04, 0xC7, 0xB6, 0x78, 0x06,     // 0x56 - 0x5d

        /*********************************************************************
         * Authority    0x5e - 0x..     (6 records)
         * 1: 0x5e - 0x6f
         *      ix.netcom.com, type= 2, class= 1, ttl= 7200
         *      rdata: ns1.ix.netcom.com
         * 
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00,     /* 0x5e - 0x65
                                v- 0x6a: ns1.ix.netcom.com                  */
        0x1C, 0x20, 0x00, 0x06, 0x03, 0x6E, 0x73, 0x31,     /* 0x66 - 0x6d
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11,                                         // 0x6e - 0x6f

        /* 2: 0x70 - 0x81
         *      ix.netcom.com, type= 2, class= 1, ttl= 7200
         *      rdata: ns2.ix.netcom.com
         * 
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00,     /* 0x70 - 0x77
                                v- 0x7c: ns2.ix.netcom.com                  */
        0x1C, 0x20, 0x00, 0x06, 0x03, 0x6E, 0x73, 0x32,     /* 0x78 - 0x7f
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11,                                         // 0x80 - 0x81
        
        /* 3: 0x82 - 0x93
         *      ix.netcom.com, type= 2, class= 1, ttl= 7200
         *      rdata: ns3.ix.netcom.com
         * 
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00,     /* 0x82 - 0x89
                                v- 0x8e: ns3.ix.netcom.com                  */
        0x1C, 0x20, 0x00, 0x06, 0x03, 0x6E, 0x73, 0x33,     /* 0x8a - 0x91
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11,                                         // 0x92 - 0x93
        
        /* 4: 0x94 - 0x..
         *      ix.netcom.com, type= 2, class= 1, ttl= 7200
         *      rdata: ns4.ix.netcom.com
         * 
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00,     /* 0x94 - 0x9b
                                v- 0xa0: ns4.ix.netcom.com                  */
        0x1C, 0x20, 0x00, 0x06, 0x03, 0x6E, 0x73, 0x34,     /* 0x9c - 0xa3
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11,                                         // 0xa4 - 0xa5

        /* 5: 0xa6 - 0xbd
         *      ix.netcom.com, type= 2, class= 1, ttl= 7200
         *      rdata: dfw-ixns1.ix.netcom.com
         * 
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00,     /* 0xa6 - 0xad
                                v- 0xb2: dfw-ixns1.ix.netcom.com            */
        0x1C, 0x20, 0x00, 0x0C, 0x09, 0x64, 0x66, 0x77,     /* 0xae - 0xb5
                                            ^- 0x11: (ix.netcom.com)        */
        0x2D, 0x69, 0x78, 0x6E, 0x73, 0x31, 0xC0, 0x11,     // 0xb6 - 0xbd

        /* 6: 0xbe - 0x..
         *      ix.netcom.com, type= 2, class= 1, ttl= 7200
         *      rdata: dfw-ixns2.ix.netcom.com
         * 
        ^- 0x11: (ix.netcom.com)                                            */
        0xC0, 0x11, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00,     /* 0xbe - 0xc5
                                v- 0xc1: dfw-ixns2.ix.netcom.com            */
        0x1C, 0x20, 0x00, 0x0C, 0x09, 0x64, 0x66, 0x77,     /* 0xc6 - 0xcd
                                            ^- 0x11: (ix.netcom.com)        */
        0x2D, 0x69, 0x78, 0x6E, 0x73, 0x32, 0xC0, 0x11,     // 0xce - 0xd5


        /*********************************************************************
         * Additional   0xd6 -          (6 records)
         * 
         *
         * 1: 0xd6 - 0x..
         *      ns1.ix.netcom.com, type= 1, class= 1, ttl= 7200
         *      rdata: 199.182.120.203
         * 
        ^- 0x6a: (ns1.ix.netcom.com)                                        */
        0xC0, 0x6a, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,     // 0xd6 - 0xdd
        0x1C, 0x20, 0x00, 0x04, 0xC7, 0xB6, 0x78, 0xCB,     // 0xde - 0xe5

        /* 2: 0x.. - 0x..
         *      ns2.ix.netcom.com, type= 1, class= 1, ttl= 7200
         *      rdata: 199.182.120.202
         * 
        ^- 0x7b: (ns2.ix.netcom.com)                                        */
        0xC0, 0x7c, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,     // 0xe6 - 0xed
        0x1C, 0x20, 0x00, 0x04, 0xC7, 0xB6, 0x78, 0xCA,     // 0xfe - 0x100

        /* 3: 0x.. - 0x..
         *      ns3.ix.netcom.com, type= 1, class= 1, ttl= 7200
         *      rdata: 199.182.120.1
         * 
        ^- 0x8e: (ns3.ix.netcom.com)                                        */
        0xC0, 0x8e, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        0x1C, 0x20, 0x00, 0x04, 0xC7, 0xB6, 0x78, 0x01,

        /* 4: 0x.. - 0x..
         *      ns4.ix.netcom.com, type= 1, class= 1, ttl= 7200
         *      rdata: 199.182.120.2
         * 
        ^- 0xa0: (ns4.ix.netcom.com)                                        */
        0xC0, 0xA0, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        0x1C, 0x20, 0x00, 0x04, 0xC7, 0xB6, 0x78, 0x02,

        /* 5: 0x.. - 0x..
         *      dfw-ixns1.ix.netcom.com, type= 1, class= 1, ttl= 7200
         *      rdata: 206.214.98.33
         * 
        ^- 0xb2: (dfw-ixns1.ix.netcom.com)                                  */
        0xC0, 0xB2, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        0x1C, 0x20, 0x00, 0x04, 0xCE, 0xD6, 0x62, 0x21,

        /* 6: 0x.. - 0x..
         *      dfw-ixns2.ix.netcom.com, type= 1, class= 1, ttl= 7200
         *      rdata: 206.214.98.34
         * 
        ^- 0xca: (dfw-ixns2.ix.netcom.com)                                  */
        0xC0, 0xca, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        0x1C, 0x20, 0x00, 0x04, 0xCE, 0xD6, 0x62, 0x22
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
//console.log("%s", message);

//process.exit(0);

/*****************************************************************************
 * Pack test
 *
 */
console.log("--------------------------------------------------------------");
var wBuf    = new Buffer( 4096 );

message.pack(wBuf);

console.log("Packed message (%d bytes):\n%s",
            message.produced, Utils.buf2hex(wBuf, 0, message.produced, 16));

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
    console.log("*** packed buffer mismatch.");
    console.log("Original source (%d bytes):\n%s",
                rBuf.length, Utils.buf2hex(rBuf, 0, rBuf.length, 16));
}
