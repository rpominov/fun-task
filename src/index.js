const create = (method, args) => ({method, args})
const noop = () => {}

const Task = {

  fromRunner(runner) {
    return create('fromRunner', {runner})
  },

  of(value) {
    return create('of', {value})
  },

  map(fn, task) {
    return create('map', {fn, task})
  },

  chain(fn, task) {
    return create('chain', {fn, task})
  },

  run(task, callback) {

    if (task.method === 'of') {
      callback(task.args.value)
      return noop
    }

    if (task.method === 'fromRunner') {
      return task.args.runner(callback)
    }

    if (task.method === 'map') {
      const {fn} = task.args
      return Task.run(task.args.task, x => {
        callback(fn(x))
      })
    }

    if (task.method === 'chain') {
      const {fn} = task.args
      let cancelChild = noop
      let cancelParent = Task.run(task.args.task, x => {
        cancelParent = noop
        cancelChild = Task.run(fn(x), callback)
      })
      return () => {
        cancelParent()
        cancelChild()
      }
    }

  },

}

export default Task
