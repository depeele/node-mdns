var Util    = require('util'),
    Utils   = require('../utils.js'),
    Mdns    = require('../mdns.js'),

    expect  = [ // Header
                0x12, 0x34, 0x80, 0x80, 0x00, 0x01, 0x00, 0x03,
                0x00, 0x04, 0x00, 0x05,

                // Message
                0x04, 0x74, 0x65, 0x73, 0x74, 0x05, 0x6c, 0x6f, // 0x00c
                0x63, 0x61, 0x6c, 0x00, 0x00, 0x01, 0x00, 0x01, // 0x014
                0xc0, 0x0c, 0x00, 0x06, 0x00, 0x01, 0x00, 0x00, // 0x01c
                0x00, 0x01, 0x00, 0x23, 0x0a, 0x68, 0x6f, 0x73, // 0x024
                0x74, 0x6d, 0x61, 0x73, 0x74, 0x65, 0x72, 0xc0, // 0x02c
                0x0c, 0xc0, 0x28, 0x00, 0x00, 0x00, 0x01, 0x00, // 0x034
                0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x03, 0x00, // 0x03c
                0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x05, 0xc0, // 0x044
                0x0c, 0x00, 0x10, 0x00, 0x01, 0x00, 0x00, 0x00, // 0x04c
                0x02, 0x00, 0x0c, 0x0b, 0x48, 0x65, 0x6c, 0x6c, // 0x054
                0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64, 0xc0, // 0x05c
                0x0c, 0x00, 0x0f, 0x00, 0x01, 0x00, 0x00, 0x00, // 0x064
                0x03, 0x00, 0x09, 0x00, 0x0a, 0x04, 0x6d, 0x61, // 0x06c
                0x69, 0x6c, 0xc0, 0x0c, 0xc0, 0x0c, 0x00, 0x02, // 0x074
                0x00, 0x01, 0x00, 0x00, 0x00, 0x04, 0x00, 0x06, // 0x07c
                0x03, 0x6e, 0x73, 0x31, 0xc0, 0x0c, 0xc0, 0x0c, // 0x084
                0x00, 0x02, 0x00, 0x01, 0x00, 0x00, 0x00, 0x05, // 0x08c
                0x00, 0x06, 0x03, 0x6e, 0x73, 0x32, 0xc0, 0x0c, // 0x094
                0xc0, 0x0c, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00, // 0x09c
                0x00, 0x06, 0x00, 0x06, 0x03, 0x6e, 0x73, 0x33, // 0x0a4
                0xc0, 0x0c, 0xc0, 0x0c, 0x00, 0x02, 0x00, 0x01, // 0x0ac
                0x00, 0x00, 0x00, 0x07, 0x00, 0x06, 0x03, 0x6e, // 0x0b4
                0x73, 0x34, 0xc0, 0x0c, 0xc0, 0x71, 0x00, 0x01, // 0x0bc
                0x00, 0x01, 0x00, 0x00, 0x00, 0x08, 0x00, 0x04, // 0x0c4
                0x7f, 0x00, 0x00, 0x01, 0xc0, 0x84, 0x00, 0x01, // 0x0cc
                0x00, 0x01, 0x00, 0x00, 0x00, 0x09, 0x00, 0x04, // 0x0d4
                0x7f, 0x00, 0x00, 0x01, 0xc0, 0x96, 0x00, 0x01, // 0x0dc
                0x00, 0x01, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x04, // 0x0e4
                0x7f, 0x00, 0x00, 0x02, 0xc0, 0xa8, 0x00, 0x01, // 0x0ec
                0x00, 0x01, 0x00, 0x00, 0x00, 0x0b, 0x00, 0x04, // 0x0f4
                0x7f, 0x00, 0x00, 0x03, 0xc0, 0xba, 0x00, 0x01, // 0x0fc
                0x00, 0x01, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x04, // 0x104
                0x7f, 0x00, 0x00, 0x04                          // 0x10c
    ];

/*****************************************************************************
 * Creation test/pack
 *
 */
console.log("--------------------------------------------------------------");
var name    = 'test.local.',
    message = Mdns.Message({
                    header:     {id:0x1234, qr:1, ra:1},
                    question:   [
                        {qname:name, qtype:1, qclass:1}
                    ],
                    answer:     [
                        {name:name, type:'SOA', 'class':'IN', ttl:1, rdata:{
                            mname:      'hostmaster.'+ name,
                            rname:      'hostmaster.'+ name,
                            serial:     1,
                            refresh:    2,
                            retry:      3,
                            expire:     4,
                            minimum:    5
                        }},
                        {name:name, type:'TXT', 'class':'IN', ttl:2,
                         rdata:{ txt:    ['Hello World'] }
                        },
                        {name:name, type:'MX', 'class':'IN', ttl:3,
                         rdata:{
                            preference: 10,
                            exchange:   'mail.'+ name
                        }}
                    ],
                    authority:  [
                        {name:name, type:'NS', 'class':'IN', ttl:4,
                         rdata:{ ns: 'ns1.'+ name }
                        },
                        {name:name, type:'NS', 'class':'IN', ttl:5,
                         rdata:{ ns: 'ns2.'+ name }
                        },
                        {name:name, type:'NS', 'class':'IN', ttl:6,
                         rdata:{ ns: 'ns3.'+ name }
                        },
                        {name:name, type:'NS', 'class':'IN', ttl:7,
                         rdata:{ ns: 'ns4.'+ name }
                        }
                    ],
                    additional: [
                        {name:'mail.'+ name, type:'A', 'class':'IN', ttl:8,
                         rdata:{ a: '127.0.0.1'}
                        },
                        {name:'ns1.'+ name, type:'A', 'class':'IN', ttl:9,
                         rdata:{ a: '127.0.0.1' }
                        },
                        {name:'ns2.'+ name, type:'A', 'class':'IN', ttl:10,
                         rdata:{ a: '127.0.0.2' }
                        },
                        {name:'ns3.'+ name, type:'A', 'class':'IN', ttl:11,
                         rdata:{ a: '127.0.0.3' }
                        },
                        {name:'ns4.'+ name, type:'A', 'class':'IN', ttl:12,
                         rdata:{ a: '127.0.0.4' }
                        },
                    ]
              });

console.log("Generated message:\n%s", message);

//console.log("%s", Util.inspect(message, false, 20));

console.log("--------------------------------------------------------------");
var wBuf    = new Buffer( 4096 );

message.pack(wBuf);

console.log("Packed message (%d bytes):\n%s",
            message.produced, Utils.buf2hex(wBuf, {
                                            length:     message.produced,
                                            octetsPer:  16
                             }));
console.log(">>> Expect (%d bytes):\n%s",
            expect.length, Utils.buf2hex(expect, {octetsPer:16 }));

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
