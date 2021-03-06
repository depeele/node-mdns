/** @file
 *
 *  Shared utilities
 *
 */
const HEX   = '0123456789abcdef',
      ASCII = ' !"#$%&'+"'"+'()*+,-./0123456789:;<=>?@'
            + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`'
            + 'abcdefghijklmnopqrstuvwxyz{|}~';

module.exports  = {
    /** @brief  Return a hex-string representation of the given buffer.
     *  @param  buf         The buffer;
     *  @param  options     An object containing conversion options:
     *                          offset          The starting offset [ 0 ];
     *                          length          The maximum number of bytes to
     *                                          process [ 0 == all ];
     *                          octetsPer       If provided, include a newline
     *                                          every 'octetsPer' octets [ 0 ];
     *                          ascii           If true, include an ASCII
     *                                          conversion column to the right
     *                                          of the displayed octets
     *                                          [ false ];
     *                          noOffsets       If true, do NOT include offset
     *                                          labels [ false ];
     *                          prefixOctets    If true, include a '0x' prefix
     *                                          for each octet [ false ];
     *                          octetSeparator  The separator to use between
     *                                          octets [ ' ' ];
     *
     *  @return A hex-string representation of the buffer;
     */
    buf2hex:    function(buf, options) {
        options = options || {};

        var self        = this,
            hex         = [],
            offset      = options.offset    || 0,
            length      = options.length    || buf.length,
            octetsPer   = options.octetsPer || 0,
            prefix      = (octetsPer > 0 ? ' ' : ''),
            octetPrefix = (options.prefixOctets === true ? '0x' : ''),
            octetSuffix = (options.octetSeparator || ''),
            numOctets   = 0,
            ascii       = '';

        if (options.noOffsets !== true)
        {
            // Include the offset
            hex.push( self.int2hex(offset, 2)+':' );
        }

        for (var idex = offset; idex < (offset + length); idex++)
        {
            var octet   = buf[idex],
                nibbles = [ (octet >> 4) & 0x0f, octet & 0x0f ];

            hex.push(   octetPrefix
                      + HEX[ nibbles[0] ] + HEX[ nibbles[1] ]
                      + octetSuffix);

            if (options.ascii)
            {
                var aOffset = octet - 0x20;

                ascii += ( ASCII[aOffset]
                            ? ASCII[aOffset]
                            : '.');
            }

            if ((octetsPer > 0) && ((++numOctets % octetsPer) === 0))
            {
                hex.push( (ascii ? " | "+ ascii : '') + "\n");
                ascii     = '';
                numOctets = 0;

                if (options.noOffsets !== true)
                {
                    hex.push( self.int2hex(idex + 1, 2)+':' );
                }
            }
        }

        if (ascii)
        {
            while (numOctets++ < octetsPer)
            {
                hex.push('  ');
            }

            hex.push(' | '+ ascii +"\n");
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
    },

    /** @brief  Return a pluralized version of the given word based upon the
     *          provided number.
     *  @param  num     The number;
     *  @param  word    The word [ '' ];
     *
     *  @return The pluralized version of 'word'
     */
    plural: function(num, word) {
        var needPlural  = (num !== 1);

        word = word || '';

        if (needPlural)
        {
            if (word.match(/ity$/))
            {
                word = word.replace(/ity$/, 'ities');
            }
            else
            {
                word += 's';
            }
        }

        return word;
    }
};
