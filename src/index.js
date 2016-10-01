// @flow

import fl from 'fantasy-land'

type Cancel = () => void
type Handler<-T> = (x: T) => void
type Handlers<-S, -F> = {|
  success: Handler<S>,
  failure: Handler<F>,
  catch?: Handler<any>,
|}
type LooseHandlers<-S, -F> = Handler<S> | {|
  success?: Handler<S>,
  failure?: Handler<F>,
  catch?: Handler<any>,
|}
type Computation<+S, +F> = (handleSucc: Handler<S>, handleFail: Handler<F>) => ?Cancel

interface Result<+S, +F> {
  success?: S,
  failure?: F,
}

type ExtractSucc = <S>(t: Task<S, *>) => S

type ChainRecNext<T> = {type: 'next', value: T}
type ChainRecDone<T> = {type: 'done', value: T}
const chainRecNext = <T>(x: T): ChainRecNext<T> => ({type: 'next', value: x})
const chainRecDone = <T>(x: T): ChainRecDone<T> => ({type: 'done', value: x})

const defaultFailureHandler: Handler<mixed> = failure => {
  if (failure instanceof Error) {
    throw failure
  } else {
    throw new Error(`Unhandled task failure: ${String(failure)}`)
  }
}
const noop = () => {}

type RunHelperBody<S, F> = (s: Handler<S>, f: Handler<F>, c?: Handler<any>) => {
  onCancel?: Cancel, // called only when user cancels
  onClose?: Cancel, // called when user cancels plus when succ/fail/catch are called
}
const runHelper = <S, F>(body: RunHelperBody<S, F>, handlers: Handlers<S, F>): Cancel => {
  let {success, failure, catch: catch_} = handlers
  let onCancel = noop
  let onClose = noop
  let close = () => {
    onClose()
    // The idea here is to kill links to all stuff that we exposed from runHelper closure.
    // We expose via the return value (cancelation function) and by passing callbacks to the body.
    // We reason from an assumption that outer code may keep links to values that we exposed forever.
    // So we look at all things that referenced in the exposed callbacks and kill them.
    success = noop
    failure = noop
    catch_ = noop
    onCancel = noop
    close = noop
  }
  const bodyReturn = body(
    x => {
      const s = success
      close()
      s(x)
    },
    x => {
      const f = failure
      close()
      f(x)
    },
    catch_ && (x => {
      const c = (catch_: any)
      close()
      c(x)
    })
  )
  onCancel = bodyReturn.onCancel || noop
  onClose = bodyReturn.onClose || noop
  if (close === noop) {
    onCancel = noop
    onClose()
  }
  return () => { onCancel(); close() }
}

function isTask(maybeTask: mixed): boolean {
  return maybeTask instanceof Task
}

function isFun(maybeFunction: mixed): boolean {
  return typeof maybeFunction === 'function'
}

function isArrayOfTasks(maybeArray: mixed): boolean {
  if (!Array.isArray(maybeArray)) {
    return false
  }
  for (let i = 0; i < maybeArray.length; i++) {
    if (!(maybeArray[i] instanceof Task)) {
      return false
    }
  }
  return true
}

function isThenableOrFn(maybeThenable: mixed): boolean {
  return typeof maybeThenable === 'function' ||
    (
      typeof maybeThenable === 'object' &&
      maybeThenable !== null &&
      typeof maybeThenable.then === 'function'
    )
}

function inv(shouldBeTrue: boolean, errorMessage: string, actualValue: any): void {
  if (!shouldBeTrue) {
    throw new TypeError(`${errorMessage}. Actual value: ${actualValue}`)
  }
}



export default class Task<+S, +F> {

  constructor() {
    if (this.constructor === Task) {
      throw new Error('Don\'t call `new Task()`, call `Task.create()` instead')
    }
  }

  // Creates a task with an arbitrary computation
  static create<S, F>(computation: Computation<S, F>): Task<S, F> {
    inv(isFun(computation), 'Task.create(f): f is not a function', computation)
    return new FromComputation(computation)
  }

  // Creates a task that resolves with a given value
  static of<S>(value: S): Task<S, *> {
    return new Of(value)
  }

  // Creates a task that fails with a given error
  static rejected<F>(error: F): Task<*, F> {
    return new Rejected(error)
  }

  // Creates a task that never completes
  static empty(): Task<*, *> {
    return new Empty()
  }

  // Given array of tasks creates a task of array
  static parallel<F, S, A: Array<Task<S, F>>>(tasks: A): Task<$TupleMap<A, ExtractSucc>, F> {
    inv(isArrayOfTasks(tasks), 'Task.parallel(a): a is not an array of tasks', tasks)
    return new Parallel(tasks)
  }

  // Given array of tasks creates a task that completes with the earliest value or error
  static race<S, F>(tasks: Array<Task<S, F>>): Task<S, F> {
    inv(isArrayOfTasks(tasks), 'Task.race(a): a is not an array of tasks', tasks)
    return new Race(tasks)
  }

  // Transforms a task by applying `fn` to the successful value
  static map<S1>(fn: (x: S) => S1, task: Task<S, F>): Task<S1, F> {
    inv(isFun(fn), 'Task.map(f, _): f is not a function', fn)
    inv(isTask(task), 'Task.map(_, t): t is not a task', task)
    return new Map(task, fn)
  }
  map<S1>(fn: (x: S) => S1): Task<S1, F> {
    inv(isFun(fn), 'task.map(f): f is not a function', fn)
    return new Map(this, fn)
  }

  // Transforms a task by applying `fn` to the failure value
  static mapRejected<F1>(fn: (x: F) => F1, task: Task<S, F>): Task<S, F1> {
    inv(isFun(fn), 'Task.mapRejected(f, _): f is not a function', fn)
    inv(isTask(task), 'Task.mapRejected(_, t): t is not a task', task)
    return new MapRejected(task, fn)
  }
  mapRejected<F1>(fn: (x: F) => F1): Task<S, F1> {
    inv(isFun(fn), 'task.mapRejected(f): f is not a function', fn)
    return new MapRejected(this, fn)
  }

  // Transforms a task by applying `sf` to the successful value or `ff` to the failure value
  static bimap<S1, F1>(ff: (x: F) => F1, fs: (x: S) => S1, task: Task<S, F>): Task<S1, F1> {
    inv(isFun(ff), 'Task.bimap(f, _, _): f is not a function', ff)
    inv(isFun(fs), 'Task.bimap(_, f, _): f is not a function', fs)
    inv(isTask(task), 'Task.bimap(_, _, t): t is not a task', task)
    return task.map(fs).mapRejected(ff)
  }
  bimap<S1, F1>(ff: (x: F) => F1, fs: (x: S) => S1): Task<S1, F1> {
    inv(isFun(ff), 'task.bimap(f, _): f is not a function', ff)
    inv(isFun(fs), 'task.bimap(_, f): f is not a function', fs)
    return this.map(fs).mapRejected(ff)
  }

  // Transforms a task by applying `fn` to the successful value, where `fn` returns a Task
  static chain<S, F, S1, F1>(fn: (x: S) => Task<S1, F1>, task: Task<S, F>): Task<S1, F | F1> {
    inv(isFun(fn), 'Task.chain(f, _): f is not a function', fn)
    inv(isTask(task), 'Task.chain(_, t): t is not a task', task)
    return new Chain(task, fn)
  }
  chain<S1, F1>(fn: (x: S) => Task<S1, F1>): Task<S1, F | F1> {
    inv(isFun(fn), 'task.chain(f): f is not a function', fn)
    return new Chain(this, fn)
  }

  // Transforms a task by applying `fn` to the failure value, where `fn` returns a Task
  static orElse<S, F, S1, F1>(fn: (x: F) => Task<S1, F1>, task: Task<S, F>): Task<S | S1, F1> {
    inv(isFun(fn), 'Task.orElse(f, _): f is not a function', fn)
    inv(isTask(task), 'Task.orElse(_, t): t is not a task', task)
    return new OrElse(task, fn)
  }
  orElse<S1, F1>(fn: (x: F) => Task<S1, F1>): Task<S | S1, F1> {
    inv(isFun(fn), 'task.orElse(f): f is not a function', fn)
    return new OrElse(this, fn)
  }

  static recur<S, F, S1, F1>(fn: (x: S | S1) => Task<S1, F1>, task: Task<S, F>): Task<*, F | F1> {
    inv(isFun(fn), 'Task.recur(f, _): f is not a function', fn)
    inv(isTask(task), 'Task.recur(_, t): t is not a task', task)
    return new Recur(task, fn)
  }
  recur<S1, F1>(fn: (x: S | S1) => Task<S1, F1>): Task<*, F | F1> {
    inv(isFun(fn), 'task.recur(f): f is not a function', fn)
    return new Recur(this, fn)
  }

  static chainRec<N, D, F>(
    fn: (
      next: (x: N) => ChainRecNext<N>,
      done: (x: D) => ChainRecDone<D>,
      v: N
    ) => Task<ChainRecNext<N> | ChainRecDone<D>, F>,
    initial: N
  ): Task<D, F> {
    inv(isFun(fn), 'Task.chainRec(f, _): f is not a function', fn)
    return new ChainRec(fn, initial)
  }

  // Applies the successful value of task `this` to the successful value of task `otherTask`
  static ap<A, B, F1, F2>(tf: Task<(x: A) => B, F1>, tx: Task<A, F2>): Task<B, F1 | F2> {
    inv(isTask(tf), 'Task.ap(t, _): t is not a task', tf)
    inv(isTask(tx), 'Task.ap(_, t): t is not a task', tx)
    return tf.chain(f => tx.map(x => f(x)))
  }
  ap<F1, S1>(otherTask: Task<(x: S) => S1, F1>): Task<S1, F | F1> {
    inv(isTask(otherTask), 'task.ap(t): t is not a task', otherTask)
    return otherTask.chain(f => this.map(x => f(x)))
  }

  // Selects the earlier of the two tasks
  static concat<S1, F1, S2, F2>(a: Task<S1, F1>, b: Task<S2, F2>): Task<S1 | S2, F1 | F2> {
    inv(isTask(a), 'Task.concat(t, _): t is not a task', a)
    inv(isTask(b), 'Task.concat(_, t): t is not a task', b)
    return Task.race([a, b])
  }
  concat<S1, F1>(otherTask: Task<S1, F1>): Task<S | S1, F | F1> {
    inv(isTask(otherTask), 'task.concat(t): t is not a task', otherTask)
    return Task.race([this, otherTask])
  }

  static do(generator: () => Generator<Task<any, any>, Task<any, any>, mixed>): Task<mixed, mixed> {
    inv(isFun(generator), 'Task.do(f): f is not a function', generator)
    return new Do(generator)
  }

  _run(handlers: Handlers<S, F>): Cancel { // eslint-disable-line
    throw new Error('Method run() is not implemented in basic Task class.')
  }

  _toString(): string {
    return '<abstract>'
  }

  toString() {
    return `Task.${this._toString()}`
  }

  run(h: LooseHandlers<S, F>): Cancel {
    const handlers = typeof h === 'function'
      ? {success: h, failure: defaultFailureHandler}
      : {success: h.success || noop, failure: h.failure || defaultFailureHandler, catch: h.catch}
    return this._run(handlers)
  }

  toPromise(options?: {catch: boolean} = {catch: true}): Promise<Result<S, F>> {
    return new Promise((suc, err) => {
      this.run({
        success(x) { suc({success: x}) },
        failure(x) { suc({failure: x}) },
        catch: options.catch ? err : undefined,
      })
    })
  }

  static fromPromise<S>(promise: Promise<S> | () => Promise<S>): Task<S, *> {
    inv(isThenableOrFn(promise), 'Task.fromPromise(p): p is not a promise', promise)
    return new FromPromise(promise)
  }

  runAndLog(): void {
    this.run({
      success(x) { console.log('Success:', x) }, // eslint-disable-line
      failure(x) { console.log('Failure:', x) }, // eslint-disable-line
    })
  }

}

/* We should put Fantasy Land methods to class like this:
 *
 *   class Task {
 *     'fantasy-land/of'<S>(value: S): Task<S, *> { return Task.of(value) }
 *   }
 *
 * but unfortunately Flow yields "literal properties not yet supported".
 */
function makeFLCompatible(constructor: any) {
  constructor.prototype[fl.of] = constructor[fl.of] = constructor.of
  constructor.prototype[fl.empty] = constructor[fl.empty] = constructor.empty
  constructor.prototype[fl.chainRec] = constructor[fl.chainRec] = constructor.chainRec
  constructor.prototype[fl.concat] = constructor.prototype.concat
  constructor.prototype[fl.map] = constructor.prototype.map
  constructor.prototype[fl.bimap] = constructor.prototype.bimap
  constructor.prototype[fl.ap] = constructor.prototype.ap
  constructor.prototype[fl.chain] = constructor.prototype.chain
}

makeFLCompatible(Task)



class FromComputation<S, F> extends Task<S, F> {

  _computation: Computation<S, F>;

  constructor(computation: Computation<S, F>) {
    super()
    this._computation = computation
  }

  _run(handlers: Handlers<S, F>) {
    const {_computation} = this
    return runHelper((s, f, c) => {
      let cancel
      if (c) {
        try {
          cancel = _computation(s, f)
        } catch (e) { c(e) }
      } else {
        cancel = _computation(s, f)
      }
      return {onCancel: cancel || noop}
    }, handlers)
  }

  _toString() {
    return 'create(..)'
  }

}

class Of<S> extends Task<S, *> {

  _value: S;

  constructor(value: S) {
    super()
    this._value = value
  }

  _run(handlers: Handlers<S, *>): Cancel {
    const {success} = handlers
    success(this._value)
    return noop
  }

  _toString() {
    return 'of(..)'
  }

}

class Rejected<F> extends Task<*, F> {

  _error: F;

  constructor(error: F) {
    super()
    this._error = error
  }

  _run(handlers: Handlers<*, F>): Cancel {
    const {failure} = handlers
    failure(this._error)
    return noop
  }

  _toString() {
    return 'rejected(..)'
  }

}

class Empty extends Task<*, *> {

  run(): Cancel {
    return noop
  }

  _toString() {
    return `empty()`
  }

}

class Parallel<S, F> extends Task<S[], F> {

  _tasks: Array<Task<S, F>>;

  constructor(tasks: Array<Task<S, F>>) {
    super()
    this._tasks = tasks
  }

  _run(handlers: Handlers<S[], F>): Cancel {
    return runHelper((s, f, c) => {
      const length = this._tasks.length
      const values: Array<?S> = Array(length)
      let completedCount = 0
      const runTask = (task, index) => task.run({
        success(x) {
          values[index] = x
          completedCount++
          if (completedCount === length) {
            s((values: any))
          }
        },
        failure: f,
        catch: c,
      })
      const cancels = this._tasks.map(runTask)
      return {onClose() { cancels.forEach(cancel => cancel()) }}
    }, handlers)
  }

  _toString() {
    return `parallel([${this._tasks.map(x => x._toString()).join(', ')}])`
  }

}

class Race<S, F> extends Task<S, F> {

  _tasks: Array<Task<S, F>>;

  constructor(tasks: Array<Task<S, F>>) {
    super()
    this._tasks = tasks
  }

  _run(handlers: Handlers<S, F>): Cancel {
    return runHelper((success, failure, _catch) => {
      const handlers = {success, failure, catch: _catch}
      const cancels = this._tasks.map(task => task.run(handlers))
      return {onClose() { cancels.forEach(cancel => cancel()) }}
    }, handlers)
  }

  _toString() {
    return `race([${this._tasks.map(x => x._toString()).join(', ')}])`
  }

}

class Map<SIn, SOut, F> extends Task<SOut, F> {

  _task: Task<SIn, F>;
  _fn: (x: SIn) => SOut;

  constructor(task: Task<SIn, F>, fn: (x: SIn) => SOut) {
    super()
    this._task = task
    this._fn = fn
  }

  _run(handlers: Handlers<SOut, F>): Cancel {
    const {_fn} = this
    const {success, failure, catch: catch_} = handlers
    return this._task.run({
      success(x) {
        let value
        if (catch_) {
          try {
            value = _fn(x)
          } catch (e) {
            catch_(e)
            return
          }
        } else {
          value = _fn(x)
        }
        success(value)
      },
      failure,
      catch: catch_,
    })
  }

  _toString() {
    return `${this._task._toString()}.map(..)`
  }
}

class MapRejected<S, FIn, FOut> extends Task<S, FOut> {

  _task: Task<S, FIn>;
  _fn: (x: FIn) => FOut;

  constructor(task: Task<S, FIn>, fn: (x: FIn) => FOut) {
    super()
    this._task = task
    this._fn = fn
  }

  _run(handlers: Handlers<S, FOut>): Cancel {
    const {_fn} = this
    const {success, failure, catch: catch_} = handlers
    return this._task.run({
      success,
      failure(x) {
        let value
        if (catch_) {
          try {
            value = _fn(x)
          } catch (e) {
            catch_(e)
            return
          }
        } else {
          value = _fn(x)
        }
        failure(value)
      },
      catch: catch_,
    })
  }

  _toString() {
    return `${this._task._toString()}.mapRejected(..)`
  }
}

class Chain<SIn, SOut, F, F1> extends Task<SOut, F1 | F> {

  _task: Task<SIn, F>;
  _fn: (x: SIn) => Task<SOut, F1>;

  constructor(task: Task<SIn, F>, fn: (x: SIn) => Task<SOut, F1>) {
    super()
    this._task = task
    this._fn = fn
  }

  _run(handlers: Handlers<SOut, F | F1>): Cancel {
    const {_fn, _task} = this
    return runHelper((success, failure, catch_) => {
      let cancel = noop
      let spawnedHasBeenRun = false
      const cancel1 = _task.run({ // #1
        success(x) {
          let spawned
          if (catch_) {
            try {
              spawned = _fn(x)
            } catch (e) { catch_(e) }
          } else {
            spawned = _fn(x)
          }
          if (spawned) {
            cancel = spawned.run({success, failure, catch: catch_}) // #2
            spawnedHasBeenRun = true
          }
        },
        failure,
        catch: catch_,
      })
      if (!spawnedHasBeenRun) { // #2 run() may return before #1 run() returns
        cancel = cancel1
      }
      return {onCancel() { cancel() }}
    }, handlers)
  }

  _toString() {
    return `${this._task._toString()}.chain(..)`
  }
}

class OrElse<S, S1, FIn, FOut> extends Task<S | S1, FOut> {

  _task: Task<S, FIn>;
  _fn: (x: FIn) => Task<S1, FOut>;

  constructor(task: Task<S, FIn>, fn: (x: FIn) => Task<S1, FOut>) {
    super()
    this._task = task
    this._fn = fn
  }

  _run(handlers: Handlers<S | S1, FOut>): Cancel {
    const {_fn, _task} = this
    return runHelper((success, failure, catch_) => {
      let cancel = noop
      let spawnedHasBeenRun = false
      const cancel1 = _task.run({ // #1
        success,
        failure(x) {
          let spawned
          if (catch_) {
            try {
              spawned = _fn(x)
            } catch (e) { catch_(e) }
          } else {
            spawned = _fn(x)
          }
          if (spawned) {
            cancel = spawned.run({success, failure, catch: catch_}) // #2
            spawnedHasBeenRun = true
          }
        },
        catch: catch_,
      })
      if (!spawnedHasBeenRun) { // #2 run() may return before #1 run() returns
        cancel = cancel1
      }
      return {onCancel() { cancel() }}
    }, handlers)

  }

  _toString() {
    return `${this._task._toString()}.orElse(..)`
  }
}

class Recur<S1, F1, S, F> extends Task<*, F | F1> {

  _task: Task<S, F>;
  _fn: (x: S | S1) => Task<S1, F1>;

  constructor(task: Task<S, F>, fn: (x: S | S1) => Task<S1, F1>) {
    super()
    this._task = task
    this._fn = fn
  }

  _run(handlers: Handlers<S1, F | F1>): Cancel {
    const {_fn, _task} = this
    return runHelper((_, failure, catch_) => {
      let x
      let haveNewX = false
      let inLoop = false
      let spawnedHasBeenRun = false
      let sharedCancel = noop
      const success = _x => {
        haveNewX = true
        x = _x
        if (inLoop) {
          return
        }
        inLoop = true
        while(haveNewX) {
          haveNewX = false
          let spawned
          if (catch_) {
            try {
              spawned = _fn(x)
            } catch (e) { catch_(e) }
          } else {
            spawned = _fn(x)
          }
          if (spawned) {
            sharedCancel = spawned.run({success, failure, catch: catch_}) // #2
            spawnedHasBeenRun = true
          }
        }
        inLoop = false
      }
      const cancel = _task.run({success, failure, catch: catch_}) // #1
      if (!spawnedHasBeenRun) { // #2 run() may return before #1 run() returns
        sharedCancel = cancel
      }
      return {onCancel() { sharedCancel() }}
    }, handlers)
  }

  _toString() {
    return `${this._task._toString()}.recur(..)`
  }
}


class ChainRec<N, D, F> extends Task<D, F> {

  _fn: (
    next: (x: N) => ChainRecNext<N>,
    done: (x: D) => ChainRecDone<D>,
    v: N
  ) => Task<ChainRecNext<N> | ChainRecDone<D>, F>;
  _initial: N;

  constructor(
    fn: (
      next: (x: N) => ChainRecNext<N>,
      done: (x: D) => ChainRecDone<D>,
      v: N
    ) => Task<ChainRecNext<N> | ChainRecDone<D>, F>,
    initial: N
  ) {
    super()
    this._fn = fn
    this._initial = initial
  }

  _run(handlers: Handlers<D, F>): Cancel {
    const {_fn, _initial} = this
    return runHelper((success, failure, catch_) => {
      let newNext = null
      let haveNewNext = false
      let inLoop = false
      let sharedCancel = noop
      const step = (result) => {
        if (result.type === 'done') {
          success(result.value)
          return
        }
        newNext = result.value
        haveNewNext = true
        if (inLoop) {
          return
        }
        inLoop = true
        while(haveNewNext) {
          haveNewNext = false
          let spawned
          if (catch_) {
            try {
              spawned = _fn(chainRecNext, chainRecDone, newNext)
            } catch (e) { catch_(e) }
          } else {
            spawned = _fn(chainRecNext, chainRecDone, newNext)
          }
          if (spawned) {
            sharedCancel = spawned.run({success: step, failure, catch: catch_})
          }
        }
        inLoop = false
      }
      step(chainRecNext(_initial))
      return {onCancel() { sharedCancel() }}
    }, handlers)
  }

  _toString() {
    return `chainRec(..)`
  }

}


class Do extends Task<mixed, mixed> {

  _generator: () => Generator<Task<any, any>, Task<any, any>, mixed>;

  constructor(generator: () => Generator<Task<any, any>, Task<any, any>, mixed>) {
    super()
    this._generator = generator
  }

  _run(handlers: Handlers<mixed, mixed>): Cancel {
    const {_generator} = this
    return runHelper((success, failure, catch_) => {
      const iterator = _generator()
      let x
      let haveNewX = false
      let inLoop = false
      let sharedCancel = noop
      const step = _x => {
        haveNewX = true
        x = _x
        if (inLoop) {
          return
        }
        inLoop = true
        while(haveNewX) {
          haveNewX = false
          let iteratorNext
          if (catch_) {
            try {
              iteratorNext = iterator.next(x)
            } catch (e) { catch_(e) }
          } else {
            iteratorNext = iterator.next(x)
          }
          if (iteratorNext) {
            const {value: spawned, done} = iteratorNext
            sharedCancel = (spawned: any).run({success: done ? success : step, failure, catch: catch_})
          }
        }
        inLoop = false
      }
      step(undefined)
      return {onCancel() { sharedCancel() }}
    }, handlers)
  }

  _toString() {
    return `do(..)`
  }

}


class FromPromise<S> extends Task<S, *> {

  _promise: Promise<S> | () => Promise<S>;

  constructor(promise: Promise<S> | () => Promise<S>) {
    super()
    this._promise = promise
  }

  _run(handlers: Handlers<S, *>) {
    const {_promise} = this
    const promise = typeof _promise === 'function' ? _promise() : _promise
    return runHelper((success, _, catch_) => {
      promise.then(success, catch_)
      return {}
    }, handlers)
  }

  _toString() {
    return 'fromPromise(..)'
  }

}
