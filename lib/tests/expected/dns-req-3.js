--------------------------------------------------------------
Unpack mesage from 34 bytes of raw data:
message:
{
  "header": {
    "id": 0,
    "opcode": 0,
    "qr": 0,
    "aa": 0,
    "tc": 0,
    "rd": 0,
    "ra": 0,
    "z": 0,
    "ad": 0,
    "cd": 0,
    "rcode": 0,
    "qdCount": 2,
    "anCount": 0,
    "nsCount": 0,
    "arCount": 0,
    "consumed": 12
  },
  "question": [
    {
      "qname": "_http._tcp.",
      "qtype": 1,
      "qclass": 1,
      "consumed": 16
    },
    {
      "qname": "_http._tcp.",
      "qtype": 28,
      "qclass": 1,
      "consumed": 6
    }
  ],
  "answer": [],
  "authority": [],
  "additional": [],
  "consumed": 34
}
--------------------------------------------------------------
Packed message (34 bytes):
 0x0000: 00 00 00 00 00 02 00 00 00 00 00 00 05 5f 68 74 
 0x0010: 74 70 04 5f 74 63 70 00 00 01 00 01 c0 0c 00 1c 
 0x0020: 00 01
>>> packed buffer matches original source
