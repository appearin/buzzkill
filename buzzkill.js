#!/usr/bin/env node
/* global require */
var AWS = require("aws-sdk");
var syslogh = require("syslogh");
var util = require("util");

var argv = require("yargs")
    .usage("$0 -c config.buzzkill.json")
    .options("c", {
        alias: "config-file",
        describe: "path to JSON config file",
        required: true
    })
    .help("h")
    .argv;

syslogh.openlog("buzzkill", 0, syslogh.DAEMON);

var config = require(argv.configFile);
var sqs = new AWS.SQS();
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
        syslogh.syslog(syslogh.ERR, "error from twilio: %j", err);
    }
};

receivedSqsMessage = function (err, data) {
    if (err) {
        throw new Error(util.format("error from sqs.receiveMessage: %j", err));
    }
    if (data.Messages) {
        syslogh.syslog(syslogh.NOTICE, "%d SQS messages received", !!data.Messages ? data.Messages.length : 0);
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
                body = JSON.parse(message.Body).Subject || "Unknown message (no subject)";
            } catch (e) {
                syslogh.syslog(syslogh.WARNING, "Failed to parse SQS message body: %j", err);
                body = "Unknown message (unable to parse message subject)";
            }
            syslogh.syslog(syslogh.NOTICE, "sending message: ", body);
            config.twilio.recipients.forEach(function (recipient) {
                twilio.messages.create({
                    body: body,
                    to: recipient,
                    from: config.twilio.sender
                }, logTwilioError);
            });
        });
    }
    getNextMessage();
};

syslogh.syslog(syslogh.NOTICE, "Ready, listening for messages on SQS queue %s", config.sqs.QueueUrl);
syslogh.syslog(syslogh.NOTICE, "recipients: %j", config.twilio.recipients);
getNextMessage();
