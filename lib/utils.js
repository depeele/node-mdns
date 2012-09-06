/** @file
 *
 *  Shared utilities
 *
 */
const HEX   = '0123456789abcdef';

module.exports  = {
    /** @brief  Return a hex-string representation of the given buffer.
     *  @param  buf     The buffer;
     *  @param  offset  The starting offset [ 0 ];
     *  @param  length  The maximum number of bytes to process [ 0 == all ];
     *  @param  lineLen If provided, include a newline every 'lineLen'
     *                  characters [ 0 ];
     *
     *  @return A hex-string representation of the buffer;
     */
    buf2hex:    function(buf, offset, length, lineLen) {
        var hex     = [],
            outLen  = (lineLen > 0 ? 1   : 0),
            prefix  = (lineLen > 0 ? ' ' : '');

        offset = offset || 0;
        length = length || buf.length;

        for (var idex = 0; idex < length; idex++)
        {
            var octet   = buf[idex],
                nibbles = [ (octet >> 4) & 0x0f, octet & 0x0f ];

            hex.push('0x'+ HEX[ nibbles[0] ] + HEX[ nibbles[1] ]);

            if (lineLen > 0)
            {
                outLen += 5;
                if (outLen >= lineLen)
                {
                    hex.push("\n");
                    outLen = 1;
                }
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
     *  @param  num     The integer;
     *
     *  @return A hex-string representation of the integer;
     */
    int2hex:    function(num) {
        var self    = this,
            hex     = [];

        do
        {
            hex.splice(0, 0, self.octet2hex(num & 0xff));
            num >>= 8;

        } while (num);

        return '0x'+ hex.join('');
    }
};
