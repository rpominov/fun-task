// @flow

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('mapRejected')

test('works with .rejected', 1, t => {
  Task.rejected(2).mapRejected(x => x + 10).run({failure: t.calledWith(12)})
})

test('this==undefined in success cd', 1, t => {
  Task.of(2).mapRejected(x => x).run({success() { t.equal(this, undefined) }})
})

test('this==undefined in failure cd', 1, t => {
  Task.rejected(2).mapRejected(x => x).run({failure() { t.equal(this, undefined) }})
})

test('this==undefined in fn', 1, t => {
  Task.rejected(2).mapRejected(function(x) { t.equal(this, undefined); return x }).run({failure(){}})
})
