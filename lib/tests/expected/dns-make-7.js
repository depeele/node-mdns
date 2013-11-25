--------------------------------------------------------------
Generated message:
Header: id: 4660, opcode: QUERY, status: NOERROR
      : flags: qr ra
      : Question: 1, Answer: 3, Authority: 4, Additional: 5

1 question
   0: test.local.: qtype:1 (A), qclass:1 (IN)

3 answers
   0: test.local.: type:6 (SOA), class:1 (IN), ttl:1
        rdata: mname:hostmaster.test.local., rname:hostmaster.test.local., 
             : serial:1, refresh:2, retry:3, expire:4, minimum:5

   1: test.local.: type:16 (TXT), class:1 (IN), ttl:2
        rdata: txt:Hello World

   2: test.local.: type:15 (MX), class:1 (IN), ttl:3
        rdata: preference:10, exchange:mail.test.local.


4 authorities
   0: test.local.: type:2 (NS), class:1 (IN), ttl:4
        rdata: ns:ns1.test.local.

   1: test.local.: type:2 (NS), class:1 (IN), ttl:5
        rdata: ns:ns2.test.local.

   2: test.local.: type:2 (NS), class:1 (IN), ttl:6
        rdata: ns:ns3.test.local.

   3: test.local.: type:2 (NS), class:1 (IN), ttl:7
        rdata: ns:ns4.test.local.


5 additionals
   0: mail.test.local.: type:1 (A), class:1 (IN), ttl:8
        rdata: a:127.0.0.1

   1: ns1.test.local.: type:1 (A), class:1 (IN), ttl:9
        rdata: a:127.0.0.1

   2: ns2.test.local.: type:1 (A), class:1 (IN), ttl:10
        rdata: a:127.0.0.2

   3: ns3.test.local.: type:1 (A), class:1 (IN), ttl:11
        rdata: a:127.0.0.3

   4: ns4.test.local.: type:1 (A), class:1 (IN), ttl:12
        rdata: a:127.0.0.4


--------------------------------------------------------------
Packed message (272 bytes):
 0x0000: 12 34 80 80 00 01 00 03 00 04 00 05 04 74 65 73 
 0x0010: 74 05 6c 6f 63 61 6c 00 00 01 00 01 c0 0c 00 06 
 0x0020: 00 01 00 00 00 01 00 23 0a 68 6f 73 74 6d 61 73 
 0x0030: 74 65 72 c0 0c c0 28 00 00 00 01 00 00 00 02 00 
 0x0040: 00 00 03 00 00 00 04 00 00 00 05 c0 0c 00 10 00 
 0x0050: 01 00 00 00 02 00 0c 0b 48 65 6c 6c 6f 20 57 6f 
 0x0060: 72 6c 64 c0 0c 00 0f 00 01 00 00 00 03 00 09 00 
 0x0070: 0a 04 6d 61 69 6c c0 0c c0 0c 00 02 00 01 00 00 
 0x0080: 00 04 00 06 03 6e 73 31 c0 0c c0 0c 00 02 00 01 
 0x0090: 00 00 00 05 00 06 03 6e 73 32 c0 0c c0 0c 00 02 
 0x00a0: 00 01 00 00 00 06 00 06 03 6e 73 33 c0 0c c0 0c 
 0x00b0: 00 02 00 01 00 00 00 07 00 06 03 6e 73 34 c0 0c 
 0x00c0: c0 71 00 01 00 01 00 00 00 08 00 04 7f 00 00 01 
 0x00d0: c0 84 00 01 00 01 00 00 00 09 00 04 7f 00 00 01 
 0x00e0: c0 96 00 01 00 01 00 00 00 0a 00 04 7f 00 00 02 
 0x00f0: c0 a8 00 01 00 01 00 00 00 0b 00 04 7f 00 00 03 
 0x0100: c0 ba 00 01 00 01 00 00 00 0c 00 04 7f 00 00 04 
 0x0110:
>>> Expect (272 bytes):
 0x0000: 12 34 80 80 00 01 00 03 00 04 00 05 04 74 65 73 
 0x0010: 74 05 6c 6f 63 61 6c 00 00 01 00 01 c0 0c 00 06 
 0x0020: 00 01 00 00 00 01 00 23 0a 68 6f 73 74 6d 61 73 
 0x0030: 74 65 72 c0 0c c0 28 00 00 00 01 00 00 00 02 00 
 0x0040: 00 00 03 00 00 00 04 00 00 00 05 c0 0c 00 10 00 
 0x0050: 01 00 00 00 02 00 0c 0b 48 65 6c 6c 6f 20 57 6f 
 0x0060: 72 6c 64 c0 0c 00 0f 00 01 00 00 00 03 00 09 00 
 0x0070: 0a 04 6d 61 69 6c c0 0c c0 0c 00 02 00 01 00 00 
 0x0080: 00 04 00 06 03 6e 73 31 c0 0c c0 0c 00 02 00 01 
 0x0090: 00 00 00 05 00 06 03 6e 73 32 c0 0c c0 0c 00 02 
 0x00a0: 00 01 00 00 00 06 00 06 03 6e 73 33 c0 0c c0 0c 
 0x00b0: 00 02 00 01 00 00 00 07 00 06 03 6e 73 34 c0 0c 
 0x00c0: c0 71 00 01 00 01 00 00 00 08 00 04 7f 00 00 01 
 0x00d0: c0 84 00 01 00 01 00 00 00 09 00 04 7f 00 00 01 
 0x00e0: c0 96 00 01 00 01 00 00 00 0a 00 04 7f 00 00 02 
 0x00f0: c0 a8 00 01 00 01 00 00 00 0b 00 04 7f 00 00 03 
 0x0100: c0 ba 00 01 00 01 00 00 00 0c 00 04 7f 00 00 04 
 0x0110:
>>> packed buffer matches original source
