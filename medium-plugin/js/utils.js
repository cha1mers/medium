/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function GetTabUrl(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  };
  chrome.tabs.query(queryInfo, function(tabs) {
    var tab = tabs[0];
    callback(tab.url);
  });
}

/**
 * Test if string is in URL format.
 *
 * @param {string} str - string to test.
 * @return {boolean} true if url, false otherwise.
 */
function isUrl(str) {
  var pattern = new RegExp('^https?:\\/\\/');
  return pattern.test(str);
}

/**
 * Convert XML into Javascript object.
 *
 * @param {Object} xml - XML to be converted.
 * @return {Object} Javascript object created from XML.
 */
function xmlToJson(xml) {

  // Create the return object.
  var obj = {};

  if (xml.nodeType == 1) { // element
    if (xml.attributes.length > 0) {
    obj['@attributes'] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj['@attributes'][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // Do recursive call for children nodes.
  if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof(obj[nodeName]) == 'undefined') {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof(obj[nodeName].push) == 'undefined') {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}
