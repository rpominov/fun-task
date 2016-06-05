const noop = () => {}

const warn = msg => {
  /* eslint-disable */
  if (console.trace) {
    console.trace(`Warning: ${msg}`)
  } else {
    console.warn(msg)
  }
  /* eslint-enable */
}

const cancelAfterCompletion = () => {
  warn('cancel() was called after completion, this is a noop.')
}

const Strategy = {

  of({value}, cb) {
    cb(value)
    return cancelAfterCompletion
  },

  create({computation}, cb) {
    let cancel = computation(result => {
      cancel = cancelAfterCompletion
      cb(result)
    })
    return () => {
      cancel()
    }
  },

  map({task, fn}, cb) {
    return run(task, x => {
      cb(fn(x))
    })
  },

  chain({task, fn}, cb) {
    let cancelChild = noop
    let cancelParent = run(task, x => {
      cancelParent = noop
      cancelChild = run(fn(x), cb)
    })
    return () => {
      cancelParent()
      cancelChild()
    }
  },

}

const run = (task, cb) => Strategy[task.method](task.args, cb)

export default run
