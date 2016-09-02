// @flow
/* eslint-disable require-yield */

import _test from 'lobot/test'
import Task from '../src'

import 'babel-polyfill'

const test = _test.wrap('do')

test('works in simpliest case', 1, t => {
  Task.do(function* () {return Task.of(2)}).run(t.calledWith(2))
})

test('works in simpliest case (rejected)', 1, t => {
  Task.do(function* () {return Task.rejected(2)}).run({failure: t.calledWith(2)})
})

test('part of generator after `yield rejected` is not executed', 1, t => {
  Task.do(function* () {
    yield Task.rejected(2)
    t.fail()
    return Task.of(1)
  }).run({failure: t.calledWith(2)})
})

test('works in next to simpliest case', 1, t => {
  Task.do(function* () {
    const x: any = yield Task.of(2)
    const y: any = yield Task.of(3)
    return Task.of(x * y)
  }).run(t.calledWith(6))
})
