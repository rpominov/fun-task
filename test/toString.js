// @flow
/* global Promise */

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('toString')

test('of', 1, t => {
  t.equals(Task.of(1).toString(), 'Task.of(1)')
})

test('rejected', 1, t => {
  t.equals(Task.rejected(1).toString(), 'Task.rejected(1)')
})

test('create', 1, t => {
  t.equals(Task.create(() => {}).toString(), 'Task.create(..)')
})

test('empty', 1, t => {
  t.equals(Task.empty().toString(), 'Task.empty()')
})

test('parallel', 1, t => {
  t.equals(Task.parallel([Task.empty(), Task.of(1)]).toString(), 'Task.parallel([empty(), of(1)])')
})

test('race', 1, t => {
  t.equals(Task.race([Task.empty(), Task.of(1)]).toString(), 'Task.race([empty(), of(1)])')
})

test('concat', 1, t => {
  t.equals(Task.empty().concat(Task.of(1)).toString(), 'Task.race([empty(), of(1)])')
})

test('map', 1, t => {
  t.equals(Task.of(1).map(x => x).toString(), 'Task.of(1).map(..)')
})

test('map', 1, t => {
  t.equals(Task.of(1).bimap(x => x, x => x).toString(), 'Task.of(1).map(..).mapRejected(..)')
})

test('mapRejected', 1, t => {
  t.equals(Task.of(1).mapRejected(x => x).toString(), 'Task.of(1).mapRejected(..)')
})

test('chain', 1, t => {
  t.equals(Task.of(1).chain(x => Task.of(x)).toString(), 'Task.of(1).chain(..)')
})

test('orElse', 1, t => {
  t.equals(Task.rejected(1).orElse(x => Task.of(x)).toString(), 'Task.rejected(1).orElse(..)')
})

test('recur', 1, t => {
  t.equals(Task.of(1).recur(x => Task.of(x)).toString(), 'Task.of(1).recur(..)')
})

test('chainRec', 1, t => {
  t.equals(Task.chainRec(() => Task.rejected(), 1).toString(), 'Task.chainRec(..)')
})

test('ap', 1, t => {
  const str = Task.of(x => x).ap(Task.of(1)).toString()
  t.ok(/^Task\.of\([\s\S]+\)\.chain\(\.\.\)$/.test(str), `String "${str}" doesn't match regex`)
})

test('fromPromise', 1, t => {
  t.equals(Task.fromPromise(Promise.resolve(2)).toString(), 'Task.fromPromise(..)')
})
