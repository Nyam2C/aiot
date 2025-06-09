const Cancel = require('./src/client/Cancel');

var solace = require('solclientjs').debug; // logging supported

// Initialize factory with the most recent API defaults
var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

// enable logging to JavaScript console at WARN level
// NOTICE: works only with ('solclientjs').debug
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

// create the publisher, specifying the name of the destination topic
var publisher = new Cancel(solace,'Ticket/cancellation/123/PSY/Seoul/20250610/1/G10');
// send message to Solace PubSub+ Event Broker
publisher.run(process.argv);
