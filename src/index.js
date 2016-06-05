import run from './defaultRunStrategy'

const make = (method, args) => ({method, args})

const Task = {

  // Creates a task with an arbitrary computation
  create(computation) {
    return make('create', {computation})
  },

  // Creates a task that resolves with a given value
  of(value) {
    return make('of', {value})
  },

  // Creates a task that rejects with a given error
  rejected(error) {
    return make('rejected', {error})
  },

  // Transforms a task by applying `fn` to the successful value
  map(fn, task) {
    return make('map', {fn, task})
  },

  // Transforms a task by applying `fn` to the failure value
  mapRejected(fn, task) {
    return make('mapRejected', {fn, task})
  },

  // Transforms a task by applying `fn` to the successful value (where `fn` returns a Task)
  chain(fn, task) {
    return make('chain', {fn, task})
  },

  // Transforms a task by applying `fn` to the failure value (where `fn` returns a Task)
  orElse(fn, task) {
    return make('orElse', {fn, task})
  },

  // Applies the successful value of task `withF` to to the successful value of task `withX`
  ap(withF, withX) {
    return make('ap', {withF, withX})
  },

  // Creates a task that never completes
  empty() {
    return make('empty', {})
  },

  // Selects the earlier of the two tasks
  concat(a, b) {
    return make('concat', {a, b})
  },

  // Given array of tasks creates a task of array
  all(tasks) {
    return make('all', tasks)
  },

  // Given array of tasks creates a task that completes with the earliest value or error
  race(tasks) {
    return make('race', tasks)
  },

  // Runs a task with the default running strategy
  run,

}

export default Task
