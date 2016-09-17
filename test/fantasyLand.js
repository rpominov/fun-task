import _test from 'lobot/test'
import Task from '../src'
import fl from 'fantasy-land'

const test = _test.wrap('fantasy-land')

test('of', 3, t => {
  t.equal(typeof Task.of, 'function')
  t.equal(Task.of, Task[fl.of])
  t.equal(Task.of, Task.prototype[fl.of])
})

test('empty', 3, t => {
  t.equal(typeof Task.empty, 'function')
  t.equal(Task.empty, Task[fl.empty])
  t.equal(Task.empty, Task.prototype[fl.empty])
})

test('chainRec', 3, t => {
  t.equal(typeof Task.chainRec, 'function')
  t.equal(Task.chainRec, Task[fl.chainRec])
  t.equal(Task.chainRec, Task.prototype[fl.chainRec])
})

test('concat', 2, t => {
  t.equal(typeof Task.prototype.concat, 'function')
  t.equal(Task.prototype.concat, Task.prototype[fl.concat])
})

test('map', 2, t => {
  t.equal(typeof Task.prototype.map, 'function')
  t.equal(Task.prototype.map, Task.prototype[fl.map])
})

test('bimap', 2, t => {
  t.equal(typeof Task.prototype.bimap, 'function')
  t.equal(Task.prototype.bimap, Task.prototype[fl.bimap])
})

test('ap', 2, t => {
  t.equal(typeof Task.prototype.ap, 'function')
  t.equal(Task.prototype.ap, Task.prototype[fl.ap])
})

test('cahin', 2, t => {
  t.equal(typeof Task.prototype.chain, 'function')
  t.equal(Task.prototype.cahin, Task.prototype[fl.cahin])
})
