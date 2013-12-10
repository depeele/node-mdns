/** @file
 *
 *  A dynamic DNS advertisement client.
 *
 */
var Util    = require('util'),
    Events  = require('events'),
    Os      = require('os'),
    Net     = require('net'),
    Dgram   = require('dgram'),
    Utils   = require('./utils'),
    Mdns    = require('./mdns'),
    Client  = require('./client'),
    _       = require('lodash');

/** @brief  Create a new Advertise instance.
 *  @param  serviceType             The service type to advertise;
 *  @param  [config]                If provided, an instance configuration
 *                                  object {Object};
 *  @param  [config.name=hostname]  The service/instance name {String};
 *  @param  [config.domain=local]   The service domain {String};
 *  @param  [config.host=hostname]  The hostname of the service provider
 *                                  {String};
 *  @param  [config.port=5353]      The port of the service provider {Number};
 *  @param  [config.goodbye=false]  If true, send a GoodBye announcement
 *                                  indicating that the service is going away
 *                                  {Boolean};
 *  @param  [config.txtRecords]     If provided, a string or array
 *                                              of strings;
 *
 *
 *  @emits  response  records, rinfo, response-message, raw-data (for mDNS 0+)
 *          end
 *          timeout
 *          error     Error instance
 */
function Advertise(serviceType, config)
{
    config = config || {};

    var self        = this,
        hostParts   = Os.hostname().split('.');
        hostname    = hostParts.shift(),
        domain      = (hostParts.length > 0
                        ? hostParts.join('.')
                        : 'local'),
        clientConfig= {
            port:       config.port,
            bindings:   {
                'listening':    _.bind(_onListening, self),
                'close':        _.bind(self.end, self),
                'message':      _.bind(_processResponse, self)
            }
        };

    if (! serviceType)  { throw new Error("'serviceType' is required."); }

    _.defer(function() {Client.call( self, clientConfig ); });

    self.serviceType = serviceType;
    self.name        = (config.name       || hostname);
    self.domain      = (config.domain     || domain);
    self.host        = (config.host       || hostname +'.'+ self.domain);
    self.port        = (config.port       || 0);
    self.txtRecords  = (config.txtRecords || [ ]);
    self.goodbye     = (config.goodbye === true ? true : false);

    if (! Array.isArray(self.txtRecords))
    {
        self.txtRecords = [ self.txtRecords ];
    }
}
Util.inherits(Advertise, Events.EventEmitter);
Util.inherits(Advertise, Client);

/** @brief  Begin an advertisement.
 *
 *  @return true | Error instance;
 */
Advertise.prototype.begin = function() {
    var self        = this;

    if (self.domain.slice(-1) !== '.')  { self.domain += '.'; }
    if (self.host.slice(-1) !== '.')    { self.host    += '.'; }

    var nics        = Os.networkInterfaces(),
        serviceType = self.serviceType +'.'+ self.domain,
        serviceHost = self.name +'.'+ serviceType;

    self._records = {
        questions:  [],
        rrSet:      []
    };

    self.state     = 'beginning';

                             // '_services._dns-sd._udp'
    self._serviceDiscovery = Mdns.consts.MDNS.SD +'.'+ self.domain; 

    /***********************************************************************
     * Generate the advertisement Resource Records
     * (which will be used for both Probing and Announcing)
     *
     * :NOTE: We do NOT advertise service discovery records directly, we
     *        simply respond to any service discovery query
     *        (see _processResponse() when state === 'responding')
     */

    // 1) Add a PTR record: serviceType -> serviceHost
    self._records.questions.push({
        qname:  serviceType,
        qtype:  'PTR',
        qclass: 'ANY'
    });
    self._records.rrSet.push( Mdns.RR({
        name:   serviceType,
        type:   'PTR',
        class:  'IN',
        ttl:    (self.goodbye ? 0 : 120),   // 120 seconds for any RR with a
                                            // host name (mDNS draft RFC)
        rdata:  {
            ptr:    serviceHost
        }
    }) );

    // 2) Add an SRV record: serviceHost -> host:port
    self._records.questions.push({
        qname:  serviceHost,
        qtype:  'SRV',
        qclass: 'ANY'
    });
    self._records.rrSet.push( Mdns.RR({
        name:   serviceHost,
        type:   'SRV',
        class:  'IN',
        ttl:    (self.goodbye ? 0 : 120),   // 120 seconds for any RR with a
                                            // host name (mDNS draft RFC)
        rdata:  {
            priority:   0,
            weight:     0,
            port:       self.port,
            target:     self.host
        }
    }) );

    // 3) Add any TXT records: serviceHost
    if (self.txtRecords && (self.txtRecords.length > 0))
    {
        self._records.questions.push({
            qname:  serviceHost,
            qtype:  'TXT',
            qclass: 'ANY'
        });
        self._records.rrSet.push( Mdns.RR({
            name:   serviceHost,
            type:   'TXT',
            class:  'IN',
            ttl:    (self.goodbye ? 0 : 4500),  // 75 minutes for any RR
                                                // without a host name
                                                // (mDNS draft RFC)
            rdata:  {
                txt:    self.txtRecords
            }
        }) );
    }

    /* 4) Add an A and/or AAAA record for each network interface
     *    for self.host
     *      (except the one marked 'internal', with IPv4 address '127.0.0.1'
     *       and/or IPv6 address '::1')
     *
     *    :NOTE: If there is an mDNS responder on the network it will likely
     *           respond with authoritative records for these addresses.  In
     *           this case, the records will be removed from the
     *           probe/announcement.
     */
    self.myAddrs    = [];

    for (var name in nics)
    {
        var nic = nics[name];

        // Skip the internal nic
        if (nic[0].internal)   { continue; }

        nic.forEach(function(addr) {
            self.myAddrs.push( addr.address );

            switch (addr.family)
            {
            case 'IPv4':
                self._records.questions.push({
                    qname:  self.host,
                    qtype:  'A',
                    qclass: 'ANY'
                });
                self._records.rrSet.push( Mdns.RR({
                    name:   self.host,
                    type:   'A',
                    class:  'IN',
                    ttl:    (self.goodbye ? 0 : 120),
                    rdata:  { 'a': addr.address }
                }) );
                break;

            case 'IPv6':
                self._records.questions.push({
                    qname:  self.host,
                    qtype:  'AAAA',
                    qclass: 'ANY'
                });
                self._records.rrSet.push( Mdns.RR({
                    name:   self.host,
                    type:   'AAAA',
                    class:  'IN',
                    ttl:    (self.goodbye ? 0 : 120),
                    rdata:  { 'aaaa': addr.address }
                }) );
                break;
            }
        });
    }
    /***********************************************************************/

    return true;
};

/** @brief  End an advertise.
 */
Advertise.prototype.end   = function() {
    var self    = this;

    self.state = 'ending';

    if (self._intervalTimer)    { clearTimeout(self._intervalTimer); }
    delete self._intervalTimer;

    if (self.socket)
    {
        try {
            self.socket.close();
        } catch(e) {}

        delete self.socket;
    }

    self.emit('end');
};
module.exports = Advertise;

/**********************************************************************
 * Private helpers and utilities
 *
 */

/**
 *  UDP 'listening' event handler.
 *
 *  `this` is the controlling Advertise instance.
 */
function _onListening()
{
    var self    = this,
        ainfo   = self.socket.address();

    self.emit('listening', ainfo);

    if (self.goodbye === true)
    {
        // Service Goodbye
        _announce.call(self);
    }
    else
    {
        /* Service Advertisement
         *
         *  Initiate probing.  If successful, follow with announcing
         */
        _probe.call( self );
    }
}

/** @brief  Perform probing using the configured records.
 *
 *  `this` is the controlling Advertise instance;
 */
function _probe()
{
    var self    = this;

    self.state = 'probing';

    // Send 3 probe packets, at 250ms intervals
    var sendLimit   = 3,
        interval    = 250,
        sendCount   = 0;

    // Create the Message and indicate that it must be (re)packed.
    self.msg     = Mdns.Message({
        header:     {id:0},
        question:   self._records.questions,
        authority:  self._records.rrSet
    }),

    // Kick it off
    __probe();

    /*********************************************************************
     * A context-bound function to send the interval probes.
     *
     */
    function __probe()
    {
        if (sendCount++ > sendLimit)
        {
            // All probes sent.  Invoke announce()
            delete self._intervalTimer;

            return _announce.call(self);
        }

        console.log(">>> Probe #%d using: %s", sendCount, self.msg);

        self.send(self.msg);

        self._intervalTimer = setTimeout(function() {
            __probe();
        }, interval);
    }
}

/** @brief  Perform a service announcement using the configured records
 *
 *  `this` is the controlling Advertise instance;
 */
function _announce()
{
    var self    = this;

    self.state = 'announcing';

    if (self.msg.authority.length < 1)
    {
        // No remaining records...
        return self.end();
    }

    // Send 2 announcement packets, one every 1s
    var sendLimit   = 2,
        interval    = 1000,
        sendCount   = 0;

    /* Probing is complete so mark any remaining authority records in our rrSet
     * with 'cache-flush'
     */
    self.msg.authority.forEach(function(rr) {
        rr.cacheFlush = true;
    });

    /* Create a new Announcement Message and indicate that it must be
     * (re)packed.
     */
    self.msg     = Mdns.Message({
        header:     {id:0, qr:1, aa:1},
        //question:   self.msg.question,
        answer:     self.msg.authority
    }),

    // Kick it off
    __announce();

    /*********************************************************************
     * A context-bound function to send the interval announements.
     *
     */
    function __announce()
    {
        if (sendCount++ > sendLimit)
        {
            // All probes send.  Invoke __announce()
            delete self._intervalTimer;

            return _responder.call(self);
        }

        console.log(">>> Announce #%d using: %s", sendCount, self.msg);

        self.send( self.msg );

        self._intervalTimer = setTimeout(function() {
            __announce();
        }, interval);
    }
}

/** @brief  Move into the "responding" state where we monitor for any requests
 *          for the record(s) we've advertised and respond.
 *
 *  `this` is the controlling Advertise instance;
 */
function _responder()
{
    var self    = this;

    self.state = 'responding';

    self._authority = self.msg.answer;

    // Announcing is complete so remove the 'cache-flush' from all records.
    self._authority.forEach(function(rr) {
        rr.cacheFlush = false;
    });

    // :TODO: re-announcements
    delete self.msg;

    // Emit 'goodbye' before allowing termination
    process.on('exit',    __goodbye);
    process.on('SIGHUP',  __goodbye);
    process.on('SIGINT',  __goodbye);
    process.on('SIGQUIT', __goodbye);
    //process.on('SIGKILL', __goodbye); // Can't really catch this one...
    process.on('SIGTERM', __goodbye);

    /*************************************************************************
     * A context-bound callback
     *
     */
    function __goodbye()
    {
        // Send a GOODBYE (i.e. ttl == 0) for all records.
        var msg = Mdns.Message({
                header: {id:0, qr:1, aa:1}
            });

        for (jdex = 0, nauth = self._authority.length;
                jdex < nauth; jdex++)
        {
            auth = self._authority[jdex];
            auth.ttl = 0;

            msg.answer.push(auth);
        }

        var pack    = self.send( msg );

        // Indicate 'goodbye' by passing (rinfo = null)
        self.emit('response', msg, null,
                  (pack ? pack.buf.slice(pack.begin, pack.offset) : null));

        // Allow the message to be sent
        process.removeAllListeners();
        setTimeout(function() {
            process.exit();
        }, 500);
    }
}

/** @brief  Process a DNS response packet.
 *  @param  data    The raw DNS packet data (Buffer);
 *  @param  rinfo   The remote address/port information;
 *
 *  This routine will emit any 'response' events.
 *
 *  `this` is the controlling Advertise instance;
 */
function _processResponse(data, rinfo)
{
    var self        = this,
        response    = Mdns.Message(data);

    /* Ignore any packet that isn't:
     *  1) A response if we're not yet in the 'responding' state;
     *  2) A request  if we're in the 'responding' state;
     */
    if (self.state !== 'responding')
    {
        /* Until we've reached the 'responding' state, ignore anything that
         * isn't a response/reply
         */
        if (response.header.qr !== 1)
        {
            //console.log(">>> Ignore query packet: %s", response);
            return;
        }

        // Terminate on a DNS error response
        if (response.header.rcode !== Mdns.consts.RCODE_STR.NOERROR)
        {
            // DNS error
            self.emit('error', new Error('DNS error: '
                                         + Mdns.consts.rcode2str(
                                             response.header.rcode )) );
            return self.end( );
        }
    }

    switch (self.state)
    {
    case 'responding':
        // Ignore anything but requests
        if (response.header.qr !== 0)
        {
            return;
        }

        self.emit('query',    response, rinfo, data);

        // Is this a request for something we've advertised?
        var answers = [];
        for (idex = 0, nquestion = response.question.length;
                idex < nquestion; idex++)
        {
            var question    = response.question[ idex ],
                isDiscovery = false,
                auth;

            // Handle service discovery (_services.dns-sd._udp.%domain%).
            if ( (question.qname  === self._serviceDiscovery)      &&
                ((question.qtype  === Mdns.consts.TYPE_STR.ANY)  ||
                 (question.qtype  === Mdns.consts.TYPE_STR.PTR)) )
            {
                /* This is a service discovery query.
                 *
                 * Respond with all service pointers.
                 */
                isDiscovery = true;
            }

            for (jdex = 0, nauth = self._authority.length;
                    jdex < nauth; jdex++)
            {
                auth = self._authority[jdex];

                if (isDiscovery)
                {
                    if (auth.type === Mdns.consts.TYPE_STR.PTR)
                    {
                        // Include a record for this service
                        answers.push( Mdns.RR({
                            name:   self._serviceDiscovery,
                            type:   auth.type,
                            class:  auth.class,
                            rdata:  {
                                ptr:    auth.name
                            }
                        }) );
                    }
                }
                else if ( ((question.qtype  === Mdns.consts.TYPE_STR.ANY)  ||
                           (auth.type       === question.qtype))             &&
                           ((question.qclass === Mdns.consts.CLASS_STR.ANY) ||
                           (auth.class      === question.qclass))            &&
                           (question.qname  === auth.name) )
                {
                    // Trigger a response by including an answer
                    answers.push( auth );
                    break;
                }
            }
        }

        // If we have any answers to this query, send them now
        if (answers.length > 0)
        {
            var msg     = Mdns.Message({
                    header: {id:response.header.id, qr:1, aa:1},
                    answer: answers
                }),
                pack    = self.send( msg );

            self.emit('response', msg, rinfo,
                      (pack ? pack.buf.slice(pack.begin, pack.offset) : null));
        }
        break;

    case 'probing':
        // Probing -- check to see if the response claims authority...
        if (response.header.aa)
        {
            /* This response claims authority.  Remove from our Questions and
             * Authorities any record matching the answers in this response.
             */
            response.answer.forEach(function(answer) {
                var rec;

                for (var idex = 0, len = self.msg.question.length;
                        idex < len; idex++)
                {
                    rec = self.msg.question[idex];
                    if ((rec.qname === answer.name) &&
                        (rec.qtype === answer.type))
                    {
                        /*
                        console.log(">>> Remove question #%d:\n%s",
                                    idex, rec);
                        // */

                        // Remove this record
                        self.msg.question.splice(idex, 1);
                        break;
                    }
                }

                for (idex = 0, len = self.msg.authority.length;
                        idex < len; idex++)
                {
                    rec = self.msg.authority[idex];
                    if ((rec.name  === answer.name) &&
                        (rec.type  === answer.type) &&
                        (rec.class === answer.class))
                    {
                        /*
                        console.log(">>> Remove authority #%d:\n%s",
                                    idex, rec);
                        // */

                        // Remove this record
                        self.msg.authority.splice(idex, 1);
                        break;
                    }
                }
            });
        }
        // fall through

    default:
        self.emit('response', response, rinfo, data);

        // If we have no remaining questions or authorities, we finished.
        if ((self.state !== 'responding') &&
            (self.msg.answer.length    < 1) && 
            (self.msg.authority.length < 1))
        {
            console.log("*** No remaining questions or authorities...");
            return self.end();
        }

        break;
    }
}
