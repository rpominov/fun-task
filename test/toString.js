// @flow
/* global Promise */

import _test from 'lobot/test'
import Task from '../src'

const test = _test.wrap('toString')

test('of', 1, t => {
  t.equals(Task.of(1).toString(), 'Task.of(..)')
})

test('rejected', 1, t => {
  t.equals(Task.rejected(1).toString(), 'Task.rejected(..)')
})

test('create', 1, t => {
  t.equals(Task.create(() => {}).toString(), 'Task.create(..)')
})

test('empty', 1, t => {
  t.equals(Task.empty().toString(), 'Task.empty()')
})

test('parallel', 1, t => {
  t.equals(Task.parallel([Task.empty(), Task.of(1)]).toString(), 'Task.parallel([empty(), of(..)])')
})

test('race', 1, t => {
  t.equals(Task.race([Task.empty(), Task.of(1)]).toString(), 'Task.race([empty(), of(..)])')
})

test('concat', 1, t => {
  t.equals(Task.empty().concat(Task.of(1)).toString(), 'Task.race([empty(), of(..)])')
})

test('map', 1, t => {
  t.equals(Task.of(1).map(x => x).toString(), 'Task.of(..).map(..)')
})

test('map', 1, t => {
  t.equals(Task.of(1).bimap(x => x, x => x).toString(), 'Task.of(..).map(..).mapRejected(..)')
})

test('mapRejected', 1, t => {
  t.equals(Task.of(1).mapRejected(x => x).toString(), 'Task.of(..).mapRejected(..)')
})

test('chain', 1, t => {
  t.equals(Task.of(1).chain(x => Task.of(x)).toString(), 'Task.of(..).chain(..)')
})

test('orElse', 1, t => {
  t.equals(Task.rejected(1).orElse(x => Task.of(x)).toString(), 'Task.rejected(..).orElse(..)')
})

test('recur', 1, t => {
  t.equals(Task.of(1).recur(x => Task.of(x)).toString(), 'Task.of(..).recur(..)')
})

test('chainRec', 1, t => {
  t.equals(Task.chainRec(() => Task.rejected(), 1).toString(), 'Task.chainRec(..)')
})

test('ap', 1, t => {
  t.equals(Task.of(1).ap(Task.of(x => x)).toString(), 'Task.of(..).chain(..)')
})

test('fromPromise', 1, t => {
  t.equals(Task.fromPromise(Promise.resolve(2)).toString(), 'Task.fromPromise(..)')
})
