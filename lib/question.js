/** @file
 *
 *  A DNS Question entry (http://tools.ietf.org/html/rfc1035#section-4.1.2)
 *
 *                                      1  1  1  1  1  1
 *        0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                                               |
 *      /                     QNAME                     /
 *      /                                               /
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                     QTYPE                     |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *      |                     QCLASS                    |
 *      +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *  
 *  where:
 *  
 *  QNAME           a domain name represented as a sequence of labels, where
 *                  each label consists of a length octet followed by that
 *                  number of octets.  The domain name terminates with the
 *                  zero length octet for the null label of the root.  Note
 *                  that this field may be an odd number of octets; no
 *                  padding is used.
 *  
 *  QTYPE           a two octet code which specifies the type of the query.
 *                  The values for this field include all codes valid for a
 *                  TYPE field, together with some more general codes which
 *                  can match more than one type of RR.
 *   
 *  QCLASS          a two octet code that specifies the class of the query.
 *                  For example, the QCLASS field is IN for the Internet.
 *      
 *
 */
var Util    = require('util'),
    Utils   = require('./utils.js'),
    Consts  = require('./consts.js'),
    Unpack  = require('./unpack.js'),
    RData   = require('./rdata.js');

/** @brief  Create a new Question instance.
 *  @param  msg     The parent Message instance;
 *  @param  config  If provided, an instance configuration object:
 *                      For unpacking:
 *                          unpack  Iinitialize the new instance using this
 *                                  Unpack instance;
 *
 *                      For initialization:
 *                          qname, qtype, qclass [ Consts.CLASS_STR.IN ]
 *
 *                          NOTE: For mDNS questions, the top-bit of 'qclass'
 *                                is used to indicate that unicast responses
 *                                are preferred for this particular question.
 */
function Question(msg, config)
{
    var self    = this;

    /***************************************
     * Define a non-deletable, read-only,
     * non-enumerable reference to the
     * parent Message instance
     * {
     */
    Object.defineProperties(self, {
        'msg':  {
            value:      msg,
            writable:   true
        },
        '_data':    { value: { qname:null, qtype:null, qclass:null } },
        'qname':    {
            get:        function()      { return self._data.qname; },
            set:        function(val)   {
                // Ensure that qname ends with '.'
                if (val && (! val.match(/\.$/)))
                {
                    val += '.';
                }

                self._data.qname = val;
            },
            enumerable:     true
        },
        'qtype':    {
            get:        function()      { return self._data.qtype; },
            set:        function(val)   {
                if (typeof val === 'string')
                {
                    val = Consts.str2type(val);
                }

                self._data.qtype = val;
            },
            enumerable:     true
        },
        'qclass':   {
            get:        function()      { return self._data.qclass; },
            set:        function(val)   {
                if (typeof val === 'string')
                {
                    val = Consts.str2class(val);
                }

                if (val & 0x8000)
                {
                    // mDNS -- a unicast response is preferred.
                    self.unicastResponse = true;
                    val                 &= 0x7fff;
                }
                else
                {
                    delete self.unicastResponse;
                }

                self._data.qclass = val;
            },
            enumerable:     true
        }
    });
    /* }
     ***************************************/

    config = config || {};
    if (config instanceof Unpack)   { config = { unpack: config}; }

    self.qname  = (config.qname  || null);
    self.qtype  = (config.qtype  || 0);
    self.qclass = (config.qclass || Consts.CLASS_STR.IN);

    if (config.unpack)  { self.unpack( config.unpack ); }
}

/** @brief  Generate a string representation of this DNS question.
 *  @param  prefix      Any prefix string [ '' ];
 *  @param  lineLen     Number of characters per line [ 79 ];
 *
 *  @return The string representation.
 */
Question.prototype.toString  = function(prefix, lineLen) {
    prefix  = prefix  || '';
    lineLen = lineLen || 79;

    var self    = this,
        str     = '',
        tmp;

    str += Util.format("%s: qtype:%d (%s), qclass:%d (%s)%s",
                       self.qname,
                       self.qtype,  Consts.type2str(self.qtype),
                       self.qclass, Consts.class2str(self.qclass),
                       (self.unicastResponse ? ' - unicast-response-preferred'
                                             : ''));

    str += "\n";

    return str;
};

/****************************************************************************
 * Unpacking (for incoming DNS messages)
 *
 */

/** @brief  Given an Unpack instance, (re)initialize this instance by unpacking
 *          Question information.
 *  @param  unpack  The Unpack instance;
 *
 *  @return true (success) | false (error, this.erro will be Error instance)
 */
Question.prototype.unpack = function(unpack) {
    var self    = this;

    if (! (unpack instanceof Unpack))
    {
        self.error = new Error("'unpack' MUST be an Unpack instance");
        return false;
    }

    var start   = unpack.offset,
        minLen  = 5;

    if (unpack.remaining < minLen)
    {
        self.error = new Error("QUESTION requires at least "
                                        + minLen +" bytes");
        return false;
    }

    delete self.error; 

    // (Re)construct the internal state
    if ( ((self.qname  = unpack.domainName()) === null) ||
         ((self.qtype  = unpack.uint16())     === null) ||
         ((self.qclass = unpack.uint16())     === null) )
    {
        self.error = unpack.error;
        return false;
    }

    self.consumed = unpack.offset - start;

    return true;
};

/****************************************************************************
 * Packing (for outgoing DNS messages)
 *
 */

/** @brief  Given an Pack instance, pack this Question.
 *  @param  pack    The Pack instance;
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
Question.prototype.pack  = function(pack) {
    var self    = this,
        start   = pack.offset;

    delete self.error;

    if ( (pack.domainName( self.qname )  === null) ||
         (pack.uint16(     self.qtype )  === null) ||
         (pack.uint16(     self.qclass ) === null) )
    {
        self.error = pack.error;
        return false;
    }

    self.produced = pack.offset - start;

    return true;
};

module.exports  = Question;
