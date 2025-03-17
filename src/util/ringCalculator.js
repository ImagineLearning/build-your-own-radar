const RingCalculator = function (numberOfRings, maxRadius) {
  // This sequence is used to calculate the radius of each ring
  // Higher values create thicker rings
  var sequence = [0, 6, 5, 3, 2, 2, 2, 1, 1, 1]

  var self = {}

  self.sum = function (length) {
    return sequence.slice(0, length + 1).reduce(function (previous, current) {
      return previous + current
    }, 0)
  }

  self.getRadius = function (ring) {
    var total = self.sum(numberOfRings)
    var sum = self.sum(ring)

    return maxRadius * sum / total
  }

  return self
}

module.exports = RingCalculator
