#!/usr/bin/env node

'use strict';

const Q = require('q');
const _ = require('lodash');
const os = require('os');
const moment = require('moment');
const { execSync } = require('child_process');
const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(Q.Promise);

const delayMs = +process.env.delayMs || 1000;

main().done();

function main() {
  return gatherMetrics().then(pushMetrics).delay(delayMs).then(main);
}

function gatherMetrics() {
  const loadavg = os.loadavg();
  const freemem = os.freemem();
  const metrics = [
    { metric: 'load1', value: loadavg[0] },
    { metric: 'load5', value: loadavg[1] },
    { metric: 'load15', value: loadavg[2] },
    { metric: 'freemem', value: freemem },
    { metric: 'availDiskMb', value: availDiskMb() },
  ];

  const user = 'trevor';
  const timestamp = moment.utc().toISOString();
  return Q(_.map(metrics, metric => _.assign(metric, { user, timestamp })));
}

function availDiskMb() {
  const command = 'docker run --rm -v /Users:/Users debian:jessie  bash -c "df -m --output=avail /Users | tail -1"';
  return +(execSync(command).toString('utf8'));
}

const kinesis = new AWS.Kinesis({ region: 'us-east-1' });
function pushMetrics(metrics) {
  if (+process.env.CONSOLE_OUTPUT) {
    console.log(JSON.stringify(metrics));
    return null;
  }

  const StreamName = 'talk-metrics';
  const Records = _.map(metrics, (metric) => {
    return {
      Data: `${JSON.stringify(metric)}\n`,
      PartitionKey: metric.user,
    };
  });
  return kinesis.putRecords({ Records, StreamName })
    .promise()
    .tap(() => console.log(`wrote ${_.size(Records)} records to ${StreamName}`));
}
