/** @file
 *
 *  Shared utilities
 *
 */
const HEX   = '0123456789abcdef';

module.exports  = {
    /** @brief  Return a hex-string representation of the given buffer.
     *  @param  buf         The buffer;
     *  @param  offset      The starting offset [ 0 ];
     *  @param  length      The maximum number of bytes to process [ 0 == all ];
     *  @param  octetsPer   If provided, include a newline every 'octetsPer'
     *                      octets [ 0 ];
     *
     *  @return A hex-string representation of the buffer;
     */
    buf2hex:    function(buf, offset, length, octetsPer) {
        var self        = this,
            hex         = [],
            prefix      = (octetsPer > 0 ? ' ' : ''),
            numOctets   = 0;

        offset = offset || 0;
        length = length || buf.length;

        // Include the offset
        hex.push( self.int2hex(offset, 2)+':' );

        for (var idex = offset; idex < (offset + length); idex++)
        {
            var octet   = buf[idex],
                nibbles = [ (octet >> 4) & 0x0f, octet & 0x0f ];

            hex.push(HEX[ nibbles[0] ] + HEX[ nibbles[1] ]);

            if ((octetsPer > 0) && ((++numOctets % octetsPer) === 0))
            {
                hex.push("\n");
                numOctets = 0;
                hex.push( self.int2hex(idex + 1, 2)+':' );
            }
        }

        return prefix + hex.join(' ');
    },

    /** @brief  Return a hex-string representation of the given octet.
     *  @param  octet   The octet;
     *
     *  @return A hex-string representation of the octet;
     */
    octet2hex:  function(octet) {
        var hex     = '',
            nibbles = [ (octet >> 4) & 0x0f, octet & 0x0f ];

        return HEX[ nibbles[0] ] + HEX[ nibbles[1] ];
    },

    /** @brief  Return a hex-string representation of the given integer.
     *  @param  num         The integer;
     *  @param  minOctets   The minimum number of octets to present in the
     *                      hex-string representation [ 0 ];
     *
     *  @return A hex-string representation of the integer;
     */
    int2hex:    function(num, minOctets) {
        var self    = this,
            hex     = [];

        do
        {
            hex.splice(0, 0, self.octet2hex(num & 0xff));
            num >>= 8;

        } while ( (num !== 0) && (num !== -1) );

        if ((minOctets > 0) && (hex.length < minOctets))
        {
            while (hex.length < minOctets)
            {
                hex.splice(0, 0, '00');
            }
        }

        return '0x'+ hex.join('');
    }
};
