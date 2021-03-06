--------------------------------------------------------------
Unpack mesage from 310 bytes of raw data:
message:
{
  "header": {
    "id": 2,
    "opcode": 0,
    "qr": 1,
    "aa": 1,
    "tc": 0,
    "rd": 1,
    "ra": 1,
    "z": 0,
    "ad": 0,
    "cd": 0,
    "rcode": 0,
    "qdCount": 1,
    "anCount": 3,
    "nsCount": 6,
    "arCount": 6,
    "consumed": 12
  },
  "question": [
    {
      "qname": "popd.ix.netcom.com.",
      "qtype": 1,
      "qclass": 1,
      "consumed": 24
    }
  ],
  "answer": [
    {
      "name": "popd.ix.netcom.com.",
      "type": 5,
      "class": 1,
      "ttl": 60,
      "rdata": {
        "rdlength": 12,
        "cname": "popd.best.ix.netcom.com.",
        "consumed": 14
      },
      "consumed": 24
    },
    {
      "name": "popd.best.ix.netcom.com.",
      "type": 5,
      "class": 1,
      "ttl": 0,
      "rdata": {
        "rdlength": 6,
        "cname": "ix6.ix.netcom.com.",
        "consumed": 8
      },
      "consumed": 18
    },
    {
      "name": "ix6.ix.netcom.com.",
      "type": 1,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 4,
        "a": "199.182.120.6",
        "consumed": 6
      },
      "consumed": 16
    }
  ],
  "authority": [
    {
      "name": "ix.netcom.com.",
      "type": 2,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 6,
        "ns": "ns1.ix.netcom.com.",
        "consumed": 8
      },
      "consumed": 18
    },
    {
      "name": "ix.netcom.com.",
      "type": 2,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 6,
        "ns": "ns2.ix.netcom.com.",
        "consumed": 8
      },
      "consumed": 18
    },
    {
      "name": "ix.netcom.com.",
      "type": 2,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 6,
        "ns": "ns3.ix.netcom.com.",
        "consumed": 8
      },
      "consumed": 18
    },
    {
      "name": "ix.netcom.com.",
      "type": 2,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 6,
        "ns": "ns4.ix.netcom.com.",
        "consumed": 8
      },
      "consumed": 18
    },
    {
      "name": "ix.netcom.com.",
      "type": 2,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 12,
        "ns": "dfw-ixns1.ix.netcom.com.",
        "consumed": 14
      },
      "consumed": 24
    },
    {
      "name": "ix.netcom.com.",
      "type": 2,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 12,
        "ns": "dfw-ixns2.ix.netcom.com.",
        "consumed": 14
      },
      "consumed": 24
    }
  ],
  "additional": [
    {
      "name": "ns1.ix.netcom.com.",
      "type": 1,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 4,
        "a": "199.182.120.203",
        "consumed": 6
      },
      "consumed": 16
    },
    {
      "name": "ns2.ix.netcom.com.",
      "type": 1,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 4,
        "a": "199.182.120.202",
        "consumed": 6
      },
      "consumed": 16
    },
    {
      "name": "ns3.ix.netcom.com.",
      "type": 1,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 4,
        "a": "199.182.120.1",
        "consumed": 6
      },
      "consumed": 16
    },
    {
      "name": "ns4.ix.netcom.com.",
      "type": 1,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 4,
        "a": "199.182.120.2",
        "consumed": 6
      },
      "consumed": 16
    },
    {
      "name": "dfw-ixns1.ix.netcom.com.",
      "type": 1,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 4,
        "a": "206.214.98.33",
        "consumed": 6
      },
      "consumed": 16
    },
    {
      "name": "dfw-ixns2.ix.netcom.com.",
      "type": 1,
      "class": 1,
      "ttl": 7200,
      "rdata": {
        "rdlength": 4,
        "a": "206.214.98.34",
        "consumed": 6
      },
      "consumed": 16
    }
  ],
  "consumed": 310
}
--------------------------------------------------------------
Packed message (310 bytes):
 0x0000: 00 02 85 80 00 01 00 03 00 06 00 06 04 70 6f 70 
 0x0010: 64 02 69 78 06 6e 65 74 63 6f 6d 03 63 6f 6d 00 
 0x0020: 00 01 00 01 c0 0c 00 05 00 01 00 00 00 3c 00 0c 
 0x0030: 04 70 6f 70 64 04 62 65 73 74 c0 11 c0 30 00 05 
 0x0040: 00 01 00 00 00 00 00 06 03 69 78 36 c0 11 c0 48 
 0x0050: 00 01 00 01 00 00 1c 20 00 04 c7 b6 78 06 c0 11 
 0x0060: 00 02 00 01 00 00 1c 20 00 06 03 6e 73 31 c0 11 
 0x0070: c0 11 00 02 00 01 00 00 1c 20 00 06 03 6e 73 32 
 0x0080: c0 11 c0 11 00 02 00 01 00 00 1c 20 00 06 03 6e 
 0x0090: 73 33 c0 11 c0 11 00 02 00 01 00 00 1c 20 00 06 
 0x00a0: 03 6e 73 34 c0 11 c0 11 00 02 00 01 00 00 1c 20 
 0x00b0: 00 0c 09 64 66 77 2d 69 78 6e 73 31 c0 11 c0 11 
 0x00c0: 00 02 00 01 00 00 1c 20 00 0c 09 64 66 77 2d 69 
 0x00d0: 78 6e 73 32 c0 11 c0 6a 00 01 00 01 00 00 1c 20 
 0x00e0: 00 04 c7 b6 78 cb c0 7c 00 01 00 01 00 00 1c 20 
 0x00f0: 00 04 c7 b6 78 ca c0 8e 00 01 00 01 00 00 1c 20 
 0x0100: 00 04 c7 b6 78 01 c0 a0 00 01 00 01 00 00 1c 20 
 0x0110: 00 04 c7 b6 78 02 c0 b2 00 01 00 01 00 00 1c 20 
 0x0120: 00 04 ce d6 62 21 c0 ca 00 01 00 01 00 00 1c 20 
 0x0130: 00 04 ce d6 62 22
>>> packed buffer matches original source
