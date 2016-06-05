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

const resolveW = () => {
  warn('resolve() was called after a completion or a cancelation, this is a noop.')
}

const rejectW = () => {
  warn('reject() was called after a completion or a cancelation, this is a noop.')
}

const runComputation = (r, l, computation) => {
  let cancel, handleR, handleL, resolved
  const cleanup = () => {
    resolved = true
    cancel = noop
    handleR = resolveW
    handleL = rejectW
  }
  handleR = result => {
    cleanup() // (1) this line can be called _before_ computation() returns!
    r(result)
  }
  handleL = error => {
    cleanup()
    l(error)
  }
  resolved = false
  cancel = computation(x => { handleR(x) }, e => { handleL(e) })
  if (resolved) { // we need that extra logic with `resolved` because of (1)
    return noop
  }
  return () => {
    if (typeof cancel === 'function') { // we allow computation to not return a cancel logic
      cancel()
    }
    cleanup()
  }
}

const Strategy = {

  of({value}, r) {
    r(value)
    return noop
  },

  rejected({error}, _, l) {
    l(error)
    return noop
  },

  create({computation}, r, l) {
    return runComputation(r, l, computation)
  },

  map({task, fn}, r, l) {
    return run(task, x => { r(fn(x)) }, l)
  },

  chain({task, fn}, r, l) {
    return runComputation(r, l, (r1, l1) => {
      let cancelChild = noop
      const cancelParent = run(task, result => {
        cancelChild = run(fn(result), r1, l1)
      }, l1)
      return () => {
        cancelParent()
        cancelChild()
      }
    })
  },

}

const run = (task, r, l) => {
  if (typeof r !== 'function' || typeof l !== 'function') {
    throw new TypeError('You must provide both success and failure callbacks to run()')
  }
  return Strategy[task.method](task.args, r, l)
}

export default run
