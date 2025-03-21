/* eslint no-constant-condition: "off" */

const d3 = require('d3')
const Tabletop = require('tabletop')
const _ = {
  map: require('lodash/map'),
  uniqBy: require('lodash/uniqBy'),
  capitalize: require('lodash/capitalize'),
  each: require('lodash/each')
}

const InputSanitizer = require('./inputSanitizer')
const Radar = require('../models/radar')
const Quadrant = require('../models/quadrant')
const Ring = require('../models/ring')
const Blip = require('../models/blip')
const GraphingRadar = require('../graphing/radar')
const QueryParams = require('./queryParamProcessor')
const MalformedDataError = require('../exceptions/malformedDataError')
const SheetNotFoundError = require('../exceptions/sheetNotFoundError')
const ContentValidator = require('./contentValidator')
const Sheet = require('./sheet')
const ExceptionMessages = require('./exceptionMessages')
const GoogleAuth = require('./googleAuth')

const plotRadar = function (title, blips, currentRadarName, alternativeRadars) {
  if (title.endsWith('.csv')) {
    title = title.substring(0, title.length - 4)
  }
  document.title = title
  d3.selectAll('.loading').remove()

  var rings = _.map(_.uniqBy(blips, 'ring'), 'ring')
  var ringMap = {}
  var maxRings = 6

  // Define the specific ring order from center outward
  var ringOrder = ['Invest', 'Hold', 'Trial', 'Divest', 'Fleeing', 'Junkyard']
  
  // Define the ring definitions
  var ringDefinitions = {
    'Invest': 'Technologies we are currently using and recommend',
    'Hold': 'Technologies we have adopted and are satisfied with but consider not building new systems with if an alternative exists within Invest',
    'Trial': 'Technologies we are actively considering for adoption',
    'Divest': 'Technologies we are moving away from',
    'Fleeing': 'Technologies we are actively removing from our stack',
    'Junkyard': 'Technologies we no longer use or recommend'
  }
  
  // Map rings to their predefined order
  _.each(rings, function (ringName) {
    var orderIndex = ringOrder.indexOf(ringName)
    if (orderIndex === -1) {
      throw new MalformedDataError('Ring "' + ringName + '" is not in the predefined ring order')
    }
    if (orderIndex >= maxRings) {
      throw new MalformedDataError(ExceptionMessages.TOO_MANY_RINGS)
    }
    ringMap[ringName] = new Ring(ringName, orderIndex, ringDefinitions[ringName])
  })

  var quadrants = {}
  _.each(blips, function (blip) {
    if (!quadrants[blip.quadrant]) {
      quadrants[blip.quadrant] = new Quadrant(_.capitalize(blip.quadrant))
    }
    quadrants[blip.quadrant].add(new Blip(blip.name, ringMap[blip.ring], blip.icon.toLowerCase(), blip.topic, blip.description))
  })

  var radar = new Radar()
  _.each(quadrants, function (quadrant) {
    radar.addQuadrant(quadrant)
  })

  if (alternativeRadars !== undefined || true) {
    alternativeRadars.forEach(function (sheetName) {
      radar.addAlternative(sheetName)
    })
  }

  if (currentRadarName !== undefined || true) {
    radar.setCurrentSheet(currentRadarName)
  }

  var size = (window.innerHeight - 133) < 620 ? 620 : window.innerHeight - 133

  new GraphingRadar(size, radar).init().plot()
}

const GoogleSheet = function (sheetReference, sheetName) {
  var self = {}

  self.build = function () {
    var sheet = new Sheet(sheetReference)
    sheet.validate(function (error) {
      if (!error) {
        Tabletop.init({
          key: sheet.id,
          callback: createBlips
        })
        return
      }

      if (error instanceof SheetNotFoundError) {
        plotErrorMessage(error)
        return
      }
      self.authenticate(false)
    })

    function createBlips (__, tabletop) {
      try {
        if (!sheetName) {
          sheetName = tabletop.foundSheetNames[0]
        }
        var columnNames = tabletop.sheets(sheetName).columnNames

        var contentValidator = new ContentValidator(columnNames)
        contentValidator.verifyContent()
        contentValidator.verifyHeaders()

        var all = tabletop.sheets(sheetName).all()
        var blips = _.map(all, new InputSanitizer().sanitize)

        plotRadar(tabletop.googleSheetName + ' - ' + sheetName, blips, sheetName, tabletop.foundSheetNames)
      } catch (exception) {
        plotErrorMessage(exception)
      }
    }
  }

  function createBlipsForProtectedSheet (documentTitle, values, sheetNames) {
    if (!sheetName) {
      sheetName = sheetNames[0]
    }
    values.forEach(function (value) {
      var contentValidator = new ContentValidator(values[0])
      contentValidator.verifyContent()
      contentValidator.verifyHeaders()
    })

    const all = values
    const header = all.shift()
    var blips = _.map(all, blip => new InputSanitizer().sanitizeForProtectedSheet(blip, header))
    plotRadar(documentTitle + ' - ' + sheetName, blips, sheetName, sheetNames)
  }

  self.authenticate = function (force = false, callback) {
    GoogleAuth.loadGoogle(function (e) {
      GoogleAuth.login(_ => {
        var sheet = new Sheet(sheetReference)
        sheet.processSheetResponse(sheetName, createBlipsForProtectedSheet, error => {
          if (error.status === 403) {
            plotUnauthorizedErrorMessage()
          } else {
            plotErrorMessage(error)
          }
        })
        if (callback) { callback() }
      }, force)
    })
  }

  self.init = function () {
    plotLoading()
    return self
  }

  return self
}

const CSVDocument = function (url) {
  var self = {}

  self.build = function () {
    d3.csv(url).then(createBlips)
  }

  var createBlips = function (data) {
    try {
      var columnNames = data.columns
      delete data.columns
      var contentValidator = new ContentValidator(columnNames)
      contentValidator.verifyContent()
      contentValidator.verifyHeaders()
      var blips = _.map(data, new InputSanitizer().sanitize)
      plotRadar(FileName(url), blips, 'CSV File', [])
    } catch (exception) {
      plotErrorMessage(exception)
    }
  }

  self.init = function () {
    plotLoading()
    return self
  }

  return self
}

const DomainName = function (url) {
  var search = /.+:\/\/([^\\/]+)/
  var match = search.exec(decodeURIComponent(url.replace(/\+/g, ' ')))
  return match == null ? window.location.protocol + '//' + window.location.host : match[1]
}

const FileName = function (url) {
  var search = /([^\\/]+)$/
  var match = search.exec(decodeURIComponent(url.replace(/\+/g, ' ')))
  if (match != null) {
    var str = match[1]
    return str
  }
  return url
}

const GoogleSheetInput = function () {
  var self = {}
  var sheet

  self.build = function () {
    var domainName = DomainName(window.location.search.substring(1))
    var queryString = window.location.href.match(/sheetId(.*)/)
    var queryParams = queryString ? QueryParams(queryString[0]) : {}

    if (queryParams.sheetId && queryParams.sheetId.endsWith('csv')) {
      sheet = CSVDocument(queryParams.sheetId)
      sheet.init().build()
    } else if (domainName && domainName.endsWith('google.com') && queryParams.sheetId) {
      sheet = GoogleSheet(queryParams.sheetId, queryParams.sheetName)
      console.log(queryParams.sheetName)

      sheet.init().build()
    } else {
      var content = d3.select('body')
        .append('div')
        .attr('class', 'input-sheet')
      setDocumentTitle()

      plotLogo(content)

      var bannerText = '<div><h1>IL Technology Radar</h1></div>'

      plotBanner(content, bannerText)

      plotForm(content)

      plotFooter(content)
    }
  }

  return self
}

function setDocumentTitle () {
  document.title = 'IL Technology Radar'
}

function plotLoading (content) {
  content = d3.select('body')
    .append('div')
    .attr('class', 'loading')
    .append('div')
    .attr('class', 'input-sheet')

  setDocumentTitle()

  plotLogo(content)

  var bannerText = '<h1>Building your radar...</h1><p>Your Technology Radar will be available in just a few seconds</p>'
  plotBanner(content, bannerText)
  plotFooter(content)
}

function plotLogo (content) {
  content.append('div')
    .attr('class', 'input-sheet__logo')
    .html('<a href="https://www.weldnorth.com/wp-content/uploads/2020/01/wne-logo-1-300x57.png" / ></a>')
}

function plotFooter (content) {
  content
    .append('div')
    .attr('id', 'footer')
    .append('div')
    .attr('class', 'footer-content')
    .append('p')
    .html('Powered by <a href="https://www.thoughtworks.com"> ThoughtWorks</a>. ' +
      'By using this service you agree to <a href="https://www.thoughtworks.com/radar/tos">ThoughtWorks\' terms of use</a>. ' +
      'You also agree to our <a href="https://www.thoughtworks.com/privacy-policy">privacy policy</a>, which describes how we will gather, use and protect any personal data contained in your public Google Sheet. ' +
      'This software is <a href="https://github.com/thoughtworks/build-your-own-radar">open source</a> and available for download and self-hosting.')
}

function plotBanner (content, text) {
  content.append('div')
    .attr('class', 'input-sheet__banner')
    .html(text)
}

function plotForm (content) {
  content.append('div')
    .attr('class', 'input-sheet__form')
    .append('p')
    .html('<strong>Select your radar</strong>')

  var form = content.select('.input-sheet__form').append('form')
    .attr('method', 'get')

  var years = ["/radars/IL.csv"]
  form.append('select')
    .attr('name', 'sheetId')
    .selectAll('years')
      .data(years)
    .enter()
      .append('option')
    .text(function (d) { return d.substring(8, 21); })
    .attr("value", function (d) { return d; })

  form.append('button')
    .attr('type', 'submit')
    .append('a')
    .attr('class', 'button')
    .text('Show me the radar')
}

function plotErrorMessage (exception) {
  var message = 'Oops! It seems like there are some problems with loading your data. '

  var content = d3.select('body')
    .append('div')
    .attr('class', 'input-sheet')
  setDocumentTitle()

  plotLogo(content)

  var bannerText = '<div><h1>Build your own radar</h1><p>Once you\'ve <a href ="https://www.thoughtworks.com/radar/byor">created your Radar</a>, you can use this service' +
    ' to generate an <br />interactive version of your Technology Radar. Not sure how? <a href ="https://www.thoughtworks.com/radar/how-to-byor">Read this first.</a></p></div>'

  plotBanner(content, bannerText)

  d3.selectAll('.loading').remove()
  message = "Oops! We can't find the Google Sheet you've entered"
  var faqMessage = 'Please check <a href="https://www.thoughtworks.com/radar/how-to-byor">FAQs</a> for possible solutions.'
  if (exception instanceof MalformedDataError) {
    message = message.concat(exception.message)
  } else if (exception instanceof SheetNotFoundError) {
    message = exception.message
  } else {
    console.error(exception)
  }

  const container = content.append('div').attr('class', 'error-container')
  var errorContainer = container.append('div')
    .attr('class', 'error-container__message')
  errorContainer.append('div').append('p')
    .html(message)
  errorContainer.append('div').append('p')
    .html(faqMessage)

  var homePageURL = window.location.protocol + '//' + window.location.hostname
  homePageURL += (window.location.port === '' ? '' : ':' + window.location.port)
  var homePage = '<a href=' + homePageURL + '>GO BACK</a>'

  errorContainer.append('div').append('p')
    .html(homePage)

  plotFooter(content)
}

function plotUnauthorizedErrorMessage () {
  var content = d3.select('body')
    .append('div')
    .attr('class', 'input-sheet')
  setDocumentTitle()

  plotLogo(content)

  var bannerText = '<div><h1>Build your own radar</h1></div>'

  plotBanner(content, bannerText)

  d3.selectAll('.loading').remove()
  const currentUser = GoogleAuth.geEmail()
  let homePageURL = window.location.protocol + '//' + window.location.hostname
  homePageURL += (window.location.port === '' ? '' : ':' + window.location.port)
  const goBack = '<a href=' + homePageURL + '>GO BACK</a>'
  const message = `<strong>Oops!</strong> Looks like you are accessing this sheet using <b>${currentUser}</b>, which does not have permission.Try switching to another account.`

  const container = content.append('div').attr('class', 'error-container')

  const errorContainer = container.append('div')
    .attr('class', 'error-container__message')

  errorContainer.append('div').append('p')
    .attr('class', 'error-title')
    .html(message)

  const button = errorContainer.append('button')
    .attr('class', 'button switch-account-button')
    .text('SWITCH ACCOUNT')

  errorContainer.append('div').append('p')
    .attr('class', 'error-subtitle')
    .html(`or ${goBack} to try a different sheet.`)

  button.on('click', _ => {
    var queryString = window.location.href.match(/sheetId(.*)/)
    var queryParams = queryString ? QueryParams(queryString[0]) : {}
    const sheet = GoogleSheet(queryParams.sheetId, queryParams.sheetName)
    sheet.authenticate(true, _ => {
      content.remove()
    })
  })
}

module.exports = GoogleSheetInput
