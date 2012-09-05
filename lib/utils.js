/** @file
 *
 *  Shared utilities
 *
 */
const HEX   = '0123456789abcdef';

module.exports  = {
    /** @brief  Convert first byte of the provided buffer to an 8-bit
     *          unsigned integer.
     *  @param  buf     The buffer;
     *  @param  offset  The offset into 'buf' [ 0 ];
     *
     *  @return The converted 8-bit unsigned integer
     */
    parseUInt8: function(buf, offset) {
        offset = offset || 0;

        return buf.readUInt8(offset);   //buf[offset];
    },

    /** @brief  Convert first 2-bytes of the provided buffer to a 16-bit
     *          unsigned integer.
     *  @param  buf     The buffer;
     *  @param  offset  The offset into 'buf' [ 0 ];
     *
     *  @return The converted 16-bit unsigned integer
     */
    parseUInt16: function(buf, offset) {
        offset = offset || 0;

        return buf.readUInt16BE(offset);
        //return (buf[offset] * 256) + buf[offset + 1];
    },

    /** @brief  Convert first 4-bytes of the provided buffer to a 32-bit
     *          unsigned integer.
     *  @param  buf     The buffer;
     *  @param  offset  The offset into 'buf' [ 0 ];
     *
     *  @return The converted 32-bit unsigned integer
     */
    parseUInt32: function(buf, offset) {
        offset = offset || 0;

        return buf.readUInt32BE(offset);
    },

    /** @brief  Parse the labels that define DNS name.
     *  @param  buf         The buffer from which to parse the labels;
     *  @param  offset      The offset into 'buf' [ 0 ];
     *  @param  labelMap    A labelMap to use for expanding pointers.  Also
     *                      updated with labels discovered during this call;
     *
     *  @return An object containing:
     *              { name:     string,
     *                bytes:    The number of bytes consumed }
     */
    parseName:  function(buf, offset, labelMap) {
        offset = offset || 0;

        var self    = this,
            nBytes  = buf.length,
            labels  = [],
            offsets = [],
            start   = offset,
            so, len;

        /*
        console.log("parseName: [ %s ], labelMap[ %j ]",
                    self.buf2hex(buf.slice( offset )), labelMap);
        // */

        do
        {
            so      = offset;
            len     = self.parseUInt8(buf, offset);
            /* :XXX: currently EDNS0 extensions:
             *          0x40    extended label type;
             *          0x41    label type bitstring;
             */
            if (len & 0xC0)
            {
                // Pointer (end-of-name)
                var ptr = self.parseUInt16(buf, offset) & 0x3FFF;

                labels.push( (labelMap[ ptr ] ? labelMap[ ptr ] : '') );
                offsets.push( so );
                offset += 2;
                break;
            }

            // Normal label
            offset += 1;
            if (len < 1)
            {
                // end-of-name
                break;
            };

            labels.push(  buf.toString('utf8', offset, offset + len ) );
            offsets.push( so );

            offset += len;

        } while (offset < nBytes);

        /* Expand each level of this name, adding each to 'labelMap' according
         * to the offset associated with it (from above).
         */
        var fullName    = null;
        while (labels.length > 0)
        {
            var name    = labels.join('.'),
                key     = offsets.shift();

            labels.shift();

            labelMap[ key ] = name;
            if (! fullName)     { fullName = name; }
        }

        /*
        console.log("parseName: [ %s ], labelMap[ %j ]",
                    self.buf2hex(buf.slice( start, offset )), labelMap);
        // */

        return { name: fullName, bytes: offset - start };
    },

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
