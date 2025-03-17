const Ring = function (name, order, definition) {
  var self = {}

  self.name = function () {
    return name
  }

  self.order = function () {
    return order
  }

  self.definition = function () {
    return definition || 'N/A'
  }

  return self
}

module.exports = Ring
