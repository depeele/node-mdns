/** @file
 *
 *  Shared utilities
 *
 */
const HEX   = '0123456789abcdef';

module.exports  = {
    /** @brief  Return a hex-string representation of the given buffer.
     *  @param  buf     The buffer;
     *
     *  @return A hex-string representation of the buffer;
     */
    buf2hex:    function(buf) {
        var hex = [];

        for (var idex = 0, len = buf.length; idex < len; idex++)
        {
            var octet   = buf[idex],
                nibbles = [ (octet >> 4) & 0x0f, octet & 0x0f ];

            hex.push('0x'+ HEX[ nibbles[0] ] + HEX[ nibbles[1] ]);
        }

        return hex.join(' ');
    },

    /** @brief  Return a hex-string representation of the given integer.
     *  @param  num     The integer;
     *
     *  @return A hex-string representation of the integer;
     */
    int2hex:    function(num) {
        var hex     = [],
            octet, nibbles;

        do
        {
            var octet   = num & 0xff;
            num >>= 8;

            nibbles = [ (octet >> 4) & 0x0f, octet & 0x0f ];

            hex.splice(0, 0, HEX[ nibbles[0] ] + HEX[ nibbles[1] ]);

        } while (num);

        return '0x'+ hex.join('');
    }
};
