--------------------------------------------------------------
Generated message:
Header: id: 2, opcode: QUERY, status: NOERROR
      : flags: rd
      : Question: 1, Answer: 0, Authority: 0, Additional: 0

1 question
   0: popd.ix.netcom.com.: qtype:1 (A), qclass:1 (IN)

--------------------------------------------------------------
Packed message (36 bytes):
 0x0000: 00 02 01 00 00 01 00 00 00 00 00 00 04 70 6f 70 
 0x0010: 64 02 69 78 06 6e 65 74 63 6f 6d 03 63 6f 6d 00 
 0x0020: 00 01 00 01
>>> Expect (36 bytes):
 0x0000: 00 02 01 00 00 01 00 00 00 00 00 00 04 70 6f 70 
 0x0010: 64 02 69 78 06 6e 65 74 63 6f 6d 03 63 6f 6d 00 
 0x0020: 00 01 00 01
>>> packed buffer matches original source
