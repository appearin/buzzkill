# buzzkill

Send AWS SNS messages on an AWS SQS queue as SMS via Twilio.

## Details

*buzzkill* takes AWS SNS messages serialized as JSON strings in the
bodies of AWS SQS messages and sends the *Subject* of the message
as an SMS to a list of recipients via Twilio's Messages API. An
example use case is to send an SMS in reaction to AWS CloudWatch
alarms when the recipient(s) do(es) not meet the requirements for
AWS SNS-to-SMS notification (e.g. a non-US phone number).

All output from *buzzkill* is logged via *syslog*.

## Usage

To run *buzzkill*, simply run it with the absolute path to the
configuration file:

```
$ ./buzzkill.js -c /etc/buzzkill/config.json
```

An `rc.d(8)` script for FreeBSD is included in the `rc.d/` directory.
Note that `buzzkill_enable` defaults to `"YES"` in this script.

## Configuration

The configuration file should contain a JSON object with *sqs* and
*twilio* objects. The *sqs* object must have a *QueueUrl* field
containing the QueueUrl for the AWS SQS queue. The *twilio* object
must have *accountSid*, *authToken*, and *sender* fields corresponding
to the appropriate Twilio parameters. The *twilio* object should
also have a *recipients* array field containing the list of phone
numbers to receive SMS.

Example configuration file:

```
{
    "sqs": {
        "QueueUrl": "https://sqs.eu-west-1.amazonaws.com/123456789012/queue-name"
    },
    "twilio": {
        "accountSid": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        "authToken": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "sender": "+19999999999",
        "recipients": [
            "+4712345678",
            "+4787654321"
        ]
    }
}
```
