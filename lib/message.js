/** @file
 *
 *  A DNS message (http://tools.ietf.org/html/rfc1035#section-4.1)
 *
 *      +---------------------+
 *      |        Header       |
 *      +---------------------+
 *      |       Question      | the question for the name server
 *      +---------------------+
 *      |        Answer       | RRs answering the question
 *      +---------------------+
 *      |      Authority      | RRs pointing toward an authority
 *      +---------------------+
 *      |      Additional     | RRs holding additional information
 *      +---------------------+
 *
 */
var Util        = require('util'),
    Utils       = require('./utils.js'),
    Pack        = require('./pack.js'),
    Unpack      = require('./unpack.js'),
    Header      = require('./header.js'),
    Question    = require('./question.js'),
    RR          = require('./rr.js');

/** @brief  Create a new Message instance.
 *  @param  buf     If provided (as a Buffer or Unpack instance), initialize
 *                  the new instance by unpacking from 'buf');
 *  @param  offset  If provided (along with 'buf' as a Buffer), the initial
 *                  offset within 'buf' to begin unpacking [ 0 ];
 */
function Message(buf, offset)
{
    var self    = this;

    self.header   = new Header( self );
    self.question = [];
    self.rr       = [];

    self.consumed = 0;

    if (buf)    { self.unpack(buf, offset); }
}

/** @brief  Generate a string representation of this DNS message.
 *
 *  @return The string representation.
 */
Message.prototype.toString  = function() {
    var self    = this,
        str     = '',
        idex, label, rec;

    str  = 'Header: ' + self.header.toString('      : ');

    str += Util.format("\n%d %s\n",
                       self.header.qdCount,
                       Utils.plural(self.header.qdCount, 'question'));
    for (idex = 0; idex < self.header.qdCount; idex++)
    {
        rec = self.question[idex];
        if (! rec)  { continue; }

        label = '  '+ (idex < 10 ? ' ' : '') + Util.format('%d: ', idex);

        str += label + rec.toString( label.replace(/[0-9]/g, ' ') );
    }


    // Process all Resource Records (Answers, Authorities, Additionals)
    var rOffset = 0,
        rrCount = self.header.anCount
                + self.header.nsCount
                + self.header.arCount;

    for (idex = 0; idex < rrCount; idex++)
    {
        rec = self.rr[idex];
        if (! rec)  { continue; }

        if (idex === 0)
        {
            // Answer section
            rOffset = 0;
            str    += Util.format("\n%d %s\n",
                                  self.header.anCount,
                                  Utils.plural(self.header.anCount,
                                               'answer'));
        }
        if (idex === self.header.anCount)
        {
            // Authority section
            rOffset = 0;
            str    += Util.format("\n%d %s\n",
                                  self.header.nsCount,
                                  Utils.plural(self.header.nsCount,
                                               'authority'));
        }
        if (idex === (self.header.anCount + self.header.nsCount))
        {
            // Additional section
            rOffset = 0;
            str    += Util.format("\n%d %s\n",
                                  self.header.arCount,
                                  Utils.plural(self.header.arCount,
                                               'additional'));
        }

        label =  '  '
              +  (idex < 10 ? ' ' : '')
              +  Util.format('%d: ', idex - rOffset);

        str   += label + rec.toString( label.replace(/[0-9]/g, ' ') );
    }


    return str;
};

/****************************************************************************
 * Unpacking (for incoming DNS messages)
 *
 */

/** @brief  Given a readable buffer (either as a Buffer or Unpack instance),
 *          (re)initialize this instance by unpacking the contents of the
 *          buffer.
 *  @param  buf     The buffer from which to unpack;
 *  @param  offset  The starting offset within 'buf';
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
Message.prototype.unpack  = function(buf, offset) {
    var self    = this,
        unpack  = buf;

    if (Buffer.isBuffer(buf))
    {
        unpack = new Unpack(buf, offset || 0);
    }
    else if (! (buf instanceof Unpack))
    {
        self.error = new Error("'buf' must be a Buffer or Unpack instance.");
        return false;
    }

    // Reset the internal state
    unpack.beginMessage();

    self.question = [];
    self.rr       = [];

    self.consumed = 0;

    delete self.error;

    // Header
    if (! self.header.unpack( unpack ))
    {
        self.error = self.header.error;
        return false;
    }
    self.consumed += self.header.consumed;

    // Question
    self.question = [];
    for (idex = 0; idex < self.header.qdCount; idex++)
    {
        var question    = new Question( self, unpack );
        if (question.error)
        {
            self.error = question.error;
            return false;
        }
        self.consumed += question.consumed;

        self.question.push(question);
    }

    // Resource Records (Answers, Authorities, Additionals)
    var rrCount = self.header.anCount
                + self.header.nsCount
                + self.header.arCount;

    for (idex = 0; idex < rrCount; idex++)
    {
        var rr  = new RR( self, unpack );
        if (rr.error)
        {
            self.error = rr.error;
            return false;
        }
        self.consumed += rr.consumed;

        self.rr.push( rr );
    }

    //self.consumed = unpack.offset - unpack.begin;

    return true;
};

/****************************************************************************
 * Packing (for outgoing DNS messages)
 *
 */

/** @brief  Write the current instance to the given writable buffer.
 *  @param  buf     The buffer into which the instance should be packed;
 *  @param  offset  The starting offset within 'buf';
 *
 *  @return true (success) | false (error, this.error will be Error instance)
 */
Message.prototype.pack  = function(buf, offset) {
    var self    = this,
        pack    = buf;

    if (Buffer.isBuffer(buf))
    {
        pack = new Pack(buf, offset || 0);
    }
    else if (! (buf instanceof Pack))
    {
        self.error = new Error("'buf' must be a Buffer or Pack instance.");
        return false;
    }

    // Reset the internal state
    pack.beginMessage();

    self.produced   = 0;

    delete self.error;

    // Header
    if (! self.header.pack( pack ))
    {
        self.error = self.header.error;
        return false;
    }
    self.produced += self.header.produced;

    // Question
    for (idex = 0; idex < self.header.qdCount; idex++)
    {
        item = self.question[idex];
        if (! item) { continue; }

        if (! item.pack( pack ))
        {
            self.error = item.error;
            return false;
        }
        self.produced += item.produced;
    }

    // Resource Records (Answers, Authorities, Additionals)
    var rrCount = self.header.anCount
                + self.header.nsCount
                + self.header.arCount;

    for (idex = 0; idex < rrCount; idex++)
    {
        var rr  = self.rr[ idex ];
        if (! rr)   { continue; }

        if (! rr.pack( pack ))
        {
            self.error = rr.error;
            return false;
        }
        self.produced += rr.produced;
    }

    //self.produced = pack.offset - pack.begin;

    return true;
};

/****************************************************************************
 * Value <-> String conversions
 *
 */

/** @brief  Given a Resource Record/Question type, return the equivilent string.
 *  @param  typeInt The type (integer);
 *
 *  @return The matching string.
 */
Message.prototype.type2str = function(typeInt) {
    var str;

    switch (typeInt)
    {
    case 1:     str = 'A';      break;
    case 2:     str = 'NS';     break;
    case 3:     str = 'MD';     break;
    case 4:     str = 'MF';     break;
    case 5:     str = 'CNAME';  break;
    case 7:     str = 'MB';     break;
    case 8:     str = 'MG';     break;
    case 9:     str = 'MR';     break;
    case 10:    str = 'NULL';   break;
    case 11:    str = 'WKS';    break;
    case 12:    str = 'PTR';    break;
    case 13:    str = 'HINFO';  break;
    case 14:    str = 'MINFO';  break;
    case 15:    str = 'MX';     break;
    case 16:    str = 'TXT';    break;

    case 28:    str = 'AAAA';   break;
    case 47:    str = 'NSEC';   break;

    case 252:   str = 'AXFR';   break;
    case 253:   str = 'MAILB';  break;
    case 254:   str = 'MAILA';  break;
    case 255:   str = '*';      break;

    default:    str = '???';    break;
    }

    return str;
};

/** @brief  Given a Resource Record/Question type string, return the equivilent
 *          integer value.
 *  @param  str     The type string;
 *
 *  @return The matching integer value (-1 if no match).
 */
Message.prototype.str2type= function(str) {
    var typeInt = -1;

    switch (str.toLowerCase())
    {
    case 'A':       typeInt =   1;  break;
    case 'NS':      typeInt =   2;  break;
    case 'MD':      typeInt =   3;  break;
    case 'MF':      typeInt =   4;  break;
    case 'CNAME':   typeInt =   5;  break;
    case 'MB':      typeInt =   7;  break;
    case 'MG':      typeInt =   8;  break;
    case 'MR':      typeInt =   9;  break;
    case 'NULL':    typeInt =  10;  break;
    case 'WKS':     typeInt =  11;  break;
    case 'PTR':     typeInt =  12;  break;
    case 'HINFO':   typeInt =  13;  break;
    case 'MINFO':   typeInt =  14;  break;
    case 'MX':      typeInt =  15;  break;
    case 'TXT':     typeInt =  16;  break;

    case 'AAAA':    typeInt =  28;  break;
    case 'NSEC':    typeInt =  47;  break;

    case 'AXFR':    typeInt = 252;  break;
    case 'MAILB':   typeInt = 253;  break;
    case 'MAILA':   typeInt = 254;  break;
    case '*':       typeInt = 255;  break;

    default:        typeInt = -1;   break;
    }

    return typeInt;
};

/** @brief  Given a Resource Record/Question class, return the equivilent
 *          string.
 *  @param  classInt    The class (integer);
 *
 *  @return The matching string.
 */
Message.prototype.class2str = function(classInt) {
    var str;

    switch (classInt)
    {
    case 1:         str = 'IN';     break;
    case 2:         str = 'CS';     break;
    case 3:         str = 'CH';     break;
    case 4:         str = 'HS';     break;

    case 255:       str = 'ANY';    break;

    // mDNS class
    case 0x8001:    str = 'ETH';    break;

    default:        str = '???';    break;
    }

    return str;
};

/** @brief  Given a Resource Record/Question class string, return the
 *          equivilent integer value.
 *  @param  str     The class (string);
 *
 *  @return The matching integer value (-1 if no match).
 */
Message.prototype.str2class= function(str) {
    var classInt    = -1;

    switch (str.toLowerCase())
    {
    case 'IN':  classInt = 1;       break;
    case 'CS':  classInt = 2;       break;
    case 'CH':  classInt = 3;       break;
    case 'HS':  classInt = 4;       break;

    case 'ANY': classInt = 255;     break;

    // mDNS class
    case 'ETH': classInt = 0x8001;  break;

    default:    classInt = -1;      break;
    }

    return classInt;
};

module.exports  = Message;
