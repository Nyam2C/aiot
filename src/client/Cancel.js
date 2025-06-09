const checkCancel = require('./checkCancel');

var Cancel = function (solaceModule, topicName) {
    'use strict';
    var solace = solaceModule;
    var publisher = {};
    var argvs;
    publisher.session = null;
    publisher.topicName = topicName;

    // Logger
    publisher.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    // main function
    publisher.run = function (argv) {
        argvs = argv;
        publisher.connect(argv);
    };

    // Establishes connection to Solace PubSub+ Event Broker
    publisher.connect = function (argv) {
        if (publisher.session !== null) {
            publisher.log('Already connected and ready to publish messages.');
            return;
        }
        // extract params
        if (argv.length < (2 + 3)) { // expecting 3 real arguments
            publisher.log('Cannot connect: expecting all arguments' +
                ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password>.\n' +
                'Available protocols are ws://, wss://, http://, https://, tcp://, tcps://');
            process.exit();
        }

        publisher.log('*** publisher to topic "' + publisher.topicName + '" is ready to connect ***');

        var hosturl = argv.slice(2)[0];
        publisher.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        var usernamevpn = argv.slice(3)[0];
        var username = usernamevpn.split('@')[0];
        publisher.log('Client username: ' + username);
        var vpn = usernamevpn.split('@')[1];
        publisher.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        var pass = argv.slice(4)[0];

        // create session
        try {
            publisher.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
                publisherProperties: {
                  acknowledgeMode: solace.MessagePublisherAcknowledgeMode.PER_MESSAGE,
              }          
            });
        } catch (error) {
            publisher.log(error.toString());
        }
        // define session event listeners
        publisher.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            publisher.log('=== Successfully connected and ready to publish messages. ===');
            publisher.publish();
        });
        publisher.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            publisher.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        publisher.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            publisher.log('Disconnected.');
            if (publisher.session !== null) {
                publisher.session.dispose();
                publisher.session = null;
            }
        });
        publisher.session.on(solace.SessionEventCode.ACKNOWLEDGED_MESSAGE, function (sessionEvent) {
            publisher.log('Delivery of message to PubSub+ Broker with correlation key = ' +
                sessionEvent.correlationKey.id + ' confirmed.');
            publisher.exit();
        });
        publisher.session.on(solace.SessionEventCode.REJECTED_MESSAGE_ERROR, function (sessionEvent) {
            publisher.log('Delivery of message to PubSub+ Broker with correlation key = ' +
                sessionEvent.correlationKey.id + ' rejected, info: ' + sessionEvent.infoStr);
            publisher.exit();
        });

        publisher.connectToSolace();   

    };

    // Actually connects the session triggered when the iframe has been loaded - see in html code
    publisher.connectToSolace = function () {
        try {
            publisher.session.connect();
        } catch (error) {
            publisher.log(error.toString());
        }
    };

    // Publish one message
    publisher.publish = function () {
        if (publisher.session !== null) {
            var messageText = 'Sample Message';
            var message = solace.SolclientFactory.createMessage();
            message.setBinaryAttachment(messageText);
            message.setDeliveryMode(solace.MessageDeliveryModeType.PERSISTENT);
            // OPTIONAL: You can set a correlation key on the message and check for the correlation
            // in the ACKNOWLEDGE_MESSAGE callback. Define a correlation key object
            const correlationKey = {
                name: "MESSAGE_CORRELATIONKEY",
                id: Date.now()
            };
            message.setCorrelationKey(correlationKey);
            publisher.log('Publishing message "' + messageText + '" to topic "' + publisher.topicName + '/' + correlationKey.id + '"...');
            message.setDestination(solace.SolclientFactory.createTopicDestination(publisher.topicName + '/' + correlationKey.id));

            try {
                // Delivery not yet confirmed. See ConfirmedPublish.js
                publisher.session.send(message);
                publisher.log('Message sent with correlation key: ' + correlationKey.id);
                var CheckCancel = new checkCancel(solace,'Ticket/cancellation/123/>');
                CheckCancel.run(argvs);
            } catch (error) {
                publisher.log(error.toString());
            }
        } else {
            publisher.log('Cannot publish messages because not connected to Solace PubSub+ Event Broker.');
        }
    };

    publisher.exit = function () {
      publisher.disconnect();
        setTimeout(function () {
            process.exit();
        }, 1000); // wait for 1 second to finish
    };

    // Gracefully disconnects from Solace PubSub+ Event Broker
    publisher.disconnect = function () {
        publisher.log('Disconnecting from Solace PubSub+ Event Broker...');
        if (publisher.session !== null) {
            try {
                publisher.session.disconnect();
            } catch (error) {
                publisher.log(error.toString());
            }
        } else {
            publisher.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    return publisher;
};



module.exports = Cancel;