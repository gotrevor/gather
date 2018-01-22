#!/usr/bin/env node

'use strict';

const Q = require('q');
const _ = require('lodash');
const os = require('os');
const { execSync } = require('child_process');

const delayMs = +process.env.delayMs || 1000;

console.log(availDiskMb());

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
  return Q(_.map(metrics, metric => _.assign(metric, { user: 'trevor' })));
}

function availDiskMb() {
  const command = 'docker run --rm -v /Users:/Users debian:jessie  bash -c "df -m --output=avail /Users | tail -1"';
  return +(execSync(command).toString('utf8'));
}

function pushMetrics(metrics) {
  console.log(JSON.stringify(metrics));
}
