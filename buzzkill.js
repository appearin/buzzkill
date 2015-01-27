#!/usr/bin/env node
/* global console, require */
var AWS = require("aws-sdk");
var util = require("util");
var _ = require("underscore");

var argv = require("yargs")
    .usage("$0 -c config.buzzkill.json")
    .options("c", {
        alias: "config-file",
        describe: "path to JSON config file",
        required: true
    })
    .help("h")
    .argv;

var config = require(argv.configFile);
var sqs = new AWS.SQS(_.extend(config.aws, config.sqs));
var twilio = require("twilio")(config.twilio.accountSid, config.twilio.authToken);

var receivedSqsMessage;
var getNextMessage = function () {
    sqs.receiveMessage({
        QueueUrl: config.sqs.QueueUrl,
        WaitTimeSeconds: 20
    }, receivedSqsMessage);
};

var logTwilioError = function (err) {
    if (err) {
        console.error("error from twilio: %j", err);
    }
};

receivedSqsMessage = function (err, data) {
    if (err) {
        throw new Error(util.format("error from sqs.receiveMessage: %j", err));
    }
    if (data.Messages) {
        console.log("%d SQS messages received", !!data.Messages ? data.Messages.length : 0);
        data.Messages.forEach(function (message) {
            sqs.deleteMessage({
                QueueUrl: config.sqs.QueueUrl,
                ReceiptHandle: message.ReceiptHandle
            }, function (err) {
                if (err) {
                    throw new Error(util.format("error from sqs.deleteMessage: %j", err));
                }
            });
            var body;
            try {
                body = JSON.parse(message.Body);
            } catch (e) {
                console.warn("Failed to parse SQS message body: %j", err);
            }
            config.twilio.recipients.forEach(function (recipient) {
                twilio.messages.create({
                    body: util.format(config.twilio.bodyFormat,
                        !!body ? body.Subject : "Unknown notification (unable to parse message subject)"),
                    to: recipient,
                    from: config.twilio.sender
                }, logTwilioError);
            });
        });
    }
    getNextMessage();
};

console.log("Ready, listening for messages on SQS queue %s", config.sqs.QueueUrl);
console.log("recipients: %j", config.twilio.recipients);
getNextMessage();
