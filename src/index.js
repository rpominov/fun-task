// @flow

type Cancel = () => void
type Handler<-T> = (x: T) => void
type Computation<+S, +F> = (handleSucc: (s: S) => void, handleFail: (f: F) => void) => ?Cancel

const defaultFailureHandler = failure => {
  throw new Error(failure)
}

const noop = () => {}

export default class Task<+S, +F> {

  constructor() {
    if (this.constructor === Task) {
      throw new Error('Don\'t call `new Task()`, call `Task.create()` instead')
    }
  }

  // Creates a task with an arbitrary computation
  static create<S, F>(computation: Computation<S, F>): Task<S, F> {
    return new FromComputation(computation)
  }

  // Creates a task that resolves with a given value
  static of<S, F>(value: S): Task<S, F> {
    return new Of(value)
  }
  // instance alias for Fantasy Land
  of<S, F>(value: S): Task<S, F> {
    return Task.of(value)
  }

  // Creates a task that rejects with a given error
  static rejected<S, F>(error: F): Task<S, F> {
    return new Rejected(error)
  }

  // Creates a task that never completes
  static empty(): Task<any, any> {
    return new Empty()
  }
  // instance alias for Fantasy Land
  empty(): Task<any, any> {
    return Task.empty()
  }

  // Given array of tasks creates a task of array
  static all<S, F>(tasks: Array<Task<S, F>>): Task<S[], F> {
    return new All(tasks)
  }

  // Given array of tasks creates a task that completes with the earliest value or error
  static race<S, F>(task: Array<Task<S, F>>): Task<S, F> {
    return new Race(task)
  }

  // Transforms a task by applying `fn` to the successful value
  map<S1>(fn: (x: S) => S1): Task<S1, F> {
    return new Map(this, fn)
  }

  // Transforms a task by applying `fn` to the failure value
  mapRejected<F1>(fn: (x: F) => F1): Task<S, F1> {
    return new MapRejected(this, fn)
  }

  // Transforms a task by applying `fn` to the successful value (where `fn` returns a Task)
  chain<S1, F1>(fn: (x: S) => Task<S1, F1>): Task<S1, F | F1> {
    // todo
    return (null: any)
  }

  // Transforms a task by applying `fn` to the failure value (where `fn` returns a Task)
  orElse<S1, F1>(fn: (x: F) => Task<S1, F1>): Task<S | S1, F1> {
    // todo
    return (null: any)
  }

  // Applies the successful value of task `withF` to to the successful value of task `withX`
  ap<F1>(otherTask: Task<any, F1>): Task<any, F | F1> {
    return Task.all([(this: Task<any, F>), otherTask]).map(([f, x]) => f(x))
  }

  // Selects the earlier of the two tasks
  concat<S1, F1>(otherTask: Task<S1, F1>): Task<S | S1, F | F1> {
    return Task.race([this, otherTask])
  }

  run(handleSucc: Handler<S>, handleFail?: Handler<F>): Cancel {
    throw new Error('Method run() is not implemented in basic Task class.')
  }

  runAndCatch(handleSucc: Handler<S>, handleFail?: Handler<F>, handleThrown?: Handler<any>): Cancel {
    // todo: not implemented on concrete classes
    throw new Error('Method runAndCatch() is not implemented in basic Task class.')
  }

  runAndPrintResult(): void {
    this.run(
      x => console.log('Success:', x),
      x => console.log('Failure:', x)
    )
  }

}

class FromComputation<S, F> extends Task<S, F> {

  _computation: Computation<S, F>;

  constructor(computation: Computation<S, F>) {
    super()
    this._computation = computation
  }

  run(handleSucc: Handler<S>, handleFail: Handler<F> = defaultFailureHandler): Cancel {
    let succ = handleSucc
    let fail = handleFail
    let cancel = noop
    let closed = false
    let close = () => {
      succ = noop
      fail = noop
      cancel = noop
      close = noop
      closed = true
    }
    const _cancel = this._computation(x => { succ(x); close() }, x => { fail(x); close() })
    if (!closed) {
      cancel = _cancel || noop
    }
    return () => { cancel(); close() }
  }

}

class Of<S, F> extends Task<S, F> {

  _value: S;

  constructor(value: S) {
    super()
    this._value = value
  }

  run(handleSucc: Handler<S>): Cancel {
    handleSucc(this._value)
    return noop
  }

}

class Rejected<S, F> extends Task<S, F> {

  _error: F;

  constructor(error: F) {
    super()
    this._error = error
  }

  run(handleSucc: Handler<S>, handleFail: Handler<F> = defaultFailureHandler): Cancel {
    handleFail(this._error)
    return noop
  }

}

class Empty<S, F> extends Task<S, F> {

  run(): Cancel {
    return noop
  }

}

class All<S, F> extends Task<S[], F> {

  _tasks: Array<Task<S, F>>;

  constructor(tasks: Array<Task<S, F>>) {
    super()
    this._tasks = tasks
  }

  run(handleSucc: Handler<S[]>, handleFail: Handler<F> = defaultFailureHandler): Cancel {
    const length = this._tasks.length
    const values: Array<?S> = Array(length)
    let completedCount = 0
    let succ = handleSucc
    let fail = handleFail
    let cancel = noop
    let closed = false
    let cancelRest = noop
    let close = () => {
      cancelRest()
      succ = noop
      fail = noop
      close = noop
      closed = true
    }
    const onSucc = () => { if (completedCount === length) { succ((values: any)); close() } }
    const onFail = x => { fail(x); close() }
    const cancels = this._tasks.map(
      (task, index) => task.run(x => { values[index] = x; completedCount++; onSucc() }, onFail)
    )
    cancelRest = () => cancels.forEach(cancel => cancel())
    if (closed) {
      cancelRest()
    }
    return () => { close() }
  }

}

class Race<S, F> extends Task<S, F> {

  _tasks: Array<Task<S, F>>;

  constructor(tasks: Array<Task<S, F>>) {
    super()
    this._tasks = tasks
  }

  run(handleSucc: Handler<S>, handleFail: Handler<F> = defaultFailureHandler): Cancel {
    let succ = handleSucc
    let fail = handleFail
    let cancel = noop
    let closed = false
    let cancelRest = noop
    let close = () => {
      cancelRest()
      succ = noop
      fail = noop
      close = noop
      closed = true
    }
    const onSucc = x => { succ(x); close() }
    const onFail = x => { fail(x); close() }
    const cancels = this._tasks.map(task => task.run(onSucc, onFail))
    cancelRest = () => cancels.forEach(cancel => cancel())
    if (closed) {
      cancelRest()
    }
    return () => { close() }
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

  run(handleSucc: Handler<SOut>, handleFail?: Handler<F>): Cancel {
    const {_fn} = this
    return this._task.run(x => { handleSucc(_fn(x)) }, handleFail)
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

  run(handleSucc: Handler<S>, handleFail: Handler<FOut> = defaultFailureHandler): Cancel {
    const {_fn} = this
    return this._task.run(handleSucc, x => { handleFail(_fn(x)) })
  }
}
