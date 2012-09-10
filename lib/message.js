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

    self.header     = new Header( self );
    self.question   = [];
    self.answer     = [];
    self.authority  = [];
    self.additional = [];

    self.consumed   = 0;

    if (buf)    { self.unpack(buf, offset); }
}

/** @brief  Generate a string representation of this DNS message.
 *
 *  @return The string representation.
 */
Message.prototype.toString  = function() {
    var self    = this,
        str     = '',
        idex, label;

    str  = 'Header: ' + self.header.toString('      : ');

    str += Util.format("\n%d %s\n",
                       self.header.qdCount,
                       Utils.plural(self.header.qdCount, 'question'));
    for (idex = 0; idex < self.header.qdCount; idex++)
    {
        label = '  '+ (idex < 10 ? ' ' : '') + Util.format('%d: ', idex);
        str += label;
        
        label.replace(/[0-9]/g, ' ');
        str += self.question[idex].toString( label );
    }

    str += Util.format("\n%d %s\n",
                       self.header.anCount,
                       Utils.plural(self.header.anCount, 'answer'));
    for (idex = 0; idex < self.header.anCount; idex++)
    {
        label = '  '+ (idex < 10 ? ' ' : '') + Util.format('%d: ', idex);

        str += label
            +  self.answer[idex].toString( label.replace(/[0-9]/g, ' ') );
    }

    str += Util.format("\n%d %s\n",
                       self.header.nsCount,
                       Utils.plural(self.header.nsCount, 'authority'));
    for (idex = 0; idex < self.header.nsCount; idex++)
    {
        label = '  '+ (idex < 10 ? ' ' : '') + Util.format('%d: ', idex);

        str += label
            +  self.authority[idex].toString( label.replace(/[0-9]/g, ' ') );
    }

    str += Util.format("\n%d %s\n",
                       self.header.arCount,
                       Utils.plural(self.header.arCount, 'additional'));
    for (idex = 0; idex < self.header.arCount; idex++)
    {
        label = '  '+ (idex < 10 ? ' ' : '') + Util.format('%d: ', idex);

        str += label
            +  self.additional[idex].toString( label.replace(/[0-9]/g, ' ') );
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

    self.question   = [];
    self.answer     = [];
    self.authority  = [];
    self.additional = [];

    self.consumed   = 0;

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

    // Answer
    self.answer = [];
    for (idex = 0; idex < self.header.anCount; idex++)
    {
        var answer  = new RR( self, unpack );
        if (answer.error)
        {
            self.error = answer.error;
            return false;
        }
        self.consumed += answer.consumed;

        self.answer.push( answer );
    }

    // Authority
    self.authority = [];
    for (idex = 0; idex < self.header.nsCount; idex++)
    {
        var authority = new RR( self, unpack );
        if (authority.error)
        {
            self.error = authority.error;
            return false;
        }
        self.consumed += authority.consumed;

        self.authority.push( authority );
    }

    // Additional
    self.additional = [];
    for (idex = 0; idex < self.header.arCount; idex++)
    {
        var additional  = new RR( self, unpack );
        if (additional.error)
        {
            self.error = additional.error;
            return false;
        }
        self.consumed += additional.consumed;

        self.additional.push( additional );
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

    // Answer
    for (idex = 0; idex < self.header.anCount; idex++)
    {
        item = self.answer[idex];
        if (! item) { continue; }

        if (! item.pack( pack ))
        {
            self.error = item.error;
            return false;
        }
        self.produced += item.produced;
    }

    // Authority
    for (idex = 0; idex < self.header.nsCount; idex++)
    {
        item = self.authority[idex];
        if (! item) { continue; }

        if (! item.pack( pack ))
        {
            self.error = item.error;
            return false;
        }
        self.produced += item.produced;
    }

    // Additional
    for (idex = 0; idex < self.header.arCount; idex++)
    {
        item = self.additional[idex];
        if (! item) { continue; }

        if (! item.pack( pack ))
        {
            self.error = item.error;
            return false;
        }
        self.produced += item.produced;
    }

    //self.produced = pack.offset - pack.begin;

    return true;
};

module.exports  = Message;
