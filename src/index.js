// @flow

type Cancel = () => void
type Handler<-T> = (x: T) => void
type Handlers<-S, -F> = {
  success: Handler<S>,
  failure: Handler<F>,
  catch?: Handler<any>,
}
type LooseHandlers<-S, -F> = Handler<S> | {
  success?: Handler<S>,
  failure?: Handler<F>,
  catch?: Handler<any>,
}
type Computation<+S, +F> = (handleSucc: Handler<S>, handleFail: Handler<F>) => ?Cancel

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

  // Creates a task that fails with a given error
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
  static parallel<S, F>(tasks: Array<Task<S, F>>): Task<S[], F> {
    return new Parallel(tasks)
  }

  // Given array of tasks creates a task that completes with the earliest value or error
  static race<S, F>(task: Array<Task<S, F>>): Task<S, F> {
    return new Race(task)
  }

  // Transforms a task by applying `fn` to the successful value
  static map<S1>(fn: (x: S) => S1, task: Task<S, F>): Task<S1, F> {
    return new Map(task, fn)
  }
  map<S1>(fn: (x: S) => S1): Task<S1, F> {
    return new Map(this, fn)
  }

  // Transforms a task by applying `fn` to the failure value
  static mapRejected<F1>(fn: (x: F) => F1, task: Task<S, F>): Task<S, F1> {
    return new MapRejected(task, fn)
  }
  mapRejected<F1>(fn: (x: F) => F1): Task<S, F1> {
    return new MapRejected(this, fn)
  }

  // Transforms a task by applying `sf` to the successful value or `ff` to the failure value
  static bimap<S1, F1>(ff: (x: F) => F1, fs: (x: S) => S1, task: Task<S, F>): Task<S1, F1> {
    return task.map(fs).mapRejected(ff)
  }
  bimap<S1, F1>(ff: (x: F) => F1, fs: (x: S) => S1): Task<S1, F1> {
    return this.map(fs).mapRejected(ff)
  }

  // Transforms a task by applying `fn` to the successful value, where `fn` returns a Task
  static chain<S1, F1>(fn: (x: S) => Task<S1, F1>, task: Task<S, F>): Task<S1, F | F1> {
    return new Chain(task, fn)
  }
  chain<S1, F1>(fn: (x: S) => Task<S1, F1>): Task<S1, F | F1> {
    return new Chain(this, fn)
  }

  // Transforms a task by applying `fn` to the failure value, where `fn` returns a Task
  static orElse<S1, F1>(fn: (x: F) => Task<S1, F1>, task: Task<S, F>): Task<S | S1, F1> {
    return new OrElse(task, fn)
  }
  orElse<S1, F1>(fn: (x: F) => Task<S1, F1>): Task<S | S1, F1> {
    return new OrElse(this, fn)
  }

  // Applies the successful value of task `this` to to the successful value of task `otherTask`
  static ap<A, B, F1, F2>(tf: Task<(x: A) => B, F1>, tx: Task<A, F2>): Task<B, F1 | F2> {
    return tf.chain(f => tx.map(x => f(x)))
  }
  ap<F1>(otherTask: Task<any, F1>): Task<any, F | F1> {
    return this.chain(f => otherTask.map(x => (f: any)(x)))
  }

  // Selects the earlier of the two tasks
  static concat<S1, F1, S2, F2>(a: Task<S1, F1>, b: Task<S2, F2>): Task<S1 | S2, F1 | F2> {
    return Task.race([a, b])
  }
  concat<S1, F1>(otherTask: Task<S1, F1>): Task<S | S1, F | F1> {
    return Task.race([this, otherTask])
  }

  _run(handlers: Handlers<S, F>): Cancel { // eslint-disable-line
    throw new Error('Method run() is not implemented in basic Task class.')
  }

  run(h: LooseHandlers<S, F>): Cancel {
    const handlers = typeof h === 'function'
      ? {success: h, failure: defaultFailureHandler}
      : {success: h.success || noop, failure: h.failure || defaultFailureHandler, catch: h.catch}
    return this._run(handlers)
  }

  runAndLog(): void {
    this.run({
      success(x) { console.log('Success:', x) }, // eslint-disable-line
      failure(x) { console.log('Failure:', x) }, // eslint-disable-line
    })
  }

}

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

}

class Of<S> extends Task<S, any> {

  _value: S;

  constructor(value: S) {
    super()
    this._value = value
  }

  _run(handlers: Handlers<S, any>): Cancel {
    const {success} = handlers
    success(this._value)
    return noop
  }

}

class Rejected<F> extends Task<any, F> {

  _error: F;

  constructor(error: F) {
    super()
    this._error = error
  }

  _run(handlers: Handlers<any, F>): Cancel {
    const {failure} = handlers
    failure(this._error)
    return noop
  }

}

class Empty<S, F> extends Task<S, F> {

  run(): Cancel {
    return noop
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

}

class Race<S, F> extends Task<S, F> {

  _tasks: Array<Task<S, F>>;

  constructor(tasks: Array<Task<S, F>>) {
    super()
    this._tasks = tasks
  }

  _run(handlers: Handlers<S, F>): Cancel {
    return runHelper((success, failure) => {
      const handlers = {success, failure}
      const cancels = this._tasks.map(task => task.run(handlers))
      return {onClose() { cancels.forEach(cancel => cancel()) }}
    }, handlers)
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
    const {_fn} = this
    return runHelper((success, failure, catch_) => {
      let cancel2 = noop
      const cancel1 = this._task.run({
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
            cancel2 = spawned.run({success, failure, catch: catch_})
          }
        },
        failure,
        catch: catch_,
      })
      return {onCancel() { cancel1(); cancel2() }}
    }, handlers)
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
    const {_fn} = this
    return runHelper((success, failure, catch_) => {
      let cancel2 = noop
      const cancel1 = this._task.run({
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
            cancel2 = spawned.run({success, failure, catch: catch_})
          }
        },
        catch: catch_,
      })
      return {onCancel() { cancel1(); cancel2() }}
    }, handlers)

  }
}
