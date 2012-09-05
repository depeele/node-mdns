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
