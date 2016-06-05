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

const cancelW = () => {
  warn('cancel() was called after a completion or a cancelation, this is a noop.')
}

const resolveW = () => {
  warn('resolve() was called after a completion or a cancelation, this is a noop.')
}

const rejectW = () => {
  warn('reject() was called after a completion or a cancelation, this is a noop.')
}

const Strategy = {

  of({value}, r) {
    r(value)
    return cancelW
  },

  create({computation}, r, l) {
    let cancel, handleR, handleL
    const cleanup = () => {
      cancel = cancelW
      handleR = resolveW
      handleL = rejectW
    }
    handleR = result => {
      cleanup()
      r(result)
    }
    handleL = error => {
      cleanup()
      l(error)
    }
    cancel = computation(x => { handleR(x) }, e => { handleL(e) })
    return () => {
      cancel()
      cleanup()
    }
  },

  map({task, fn}, r, l) {
    return run(task, x => { r(fn(x)) }, l)
  },

  chain({task, fn}, r, l) {
    let cancel, cancelParent, cancelChild, handleR
    cancel = () => {
      cancelParent()
      cancelChild()
    }
    const cleanup = () => {
      cancel = cancelW
    }
    handleR = result => {
      cancelParent = noop
      cancelChild = run(fn(result), r, l)
    }
    cancelChild = noop
    cancelParent = run(task, handleR, l)
    return () => {
      cancel()
      cleanup()
    }
    // TODO: user will not always see 'cancel() was called after...' warning,
    // we need to wrap some (all?) r and l before passing down
  },

}

const run = (task, cb) => Strategy[task.method](task.args, cb)

export default run
