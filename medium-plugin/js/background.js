var TEMPLATE_COUNT = 3;
var FIRST_NAME = '{{first_name}}';
var FULL_NAME = '{{name}}';
var DEFAULT_TEMPLATE_CONTENT = 'Hi. I came across your Medium story and would love to add it to my publication';

/**
 * Get list of email template names.
 *
 * @param {function(Array)} callback - called when fetching all template names
 *   from storage
 */
function GetTemplatesList(callback) {
  var templateLabels = [];
  for (var i = 1; i <= TEMPLATE_COUNT; i++) {
    templateLabels.push('template_name_' + i);
  }

  chrome.storage.sync.get(templateLabels, function(items) {
    var templatesList = [];
    for (var i = 1; i <= TEMPLATE_COUNT; i++) {
      templatesList.push(items['template_name_' + i]);
    }
    callback(templatesList);
  });
}

/**
 * Replace variables inside email body.
 * Example: "Hey {{first_name}}" --> "Hey Ziad"
 *
 * @param {string} message - input message containing variables.
 * @param {Object} map - lookup map obtained from post data.
 * @return {string} message after replacing variables.
 */
function ReplaceMessageVariables(message, map) {
  for (var key in map) {
    message = message.split(key).join(map[key]);
  }
  return message;
}

/**
 * Get all URLs inside google sheet.
 *
 * @param {Object} feed - google sheet feed.
 * @return {Array} List of all urls inside sheet.
 */
function GetEntriesFromSpreadsheet(feed) {
  var filtered = [];
  for (var entry in feed.feed.entry) {
    var cell = feed.feed.entry[entry]['gs:cell']['@attributes'];
    if (isUrl(cell.inputValue)) {
      filtered.push(cell.inputValue);
    }
  }
  return filtered;
}

/**
 * Get Google sheet ID from URL. Google sheets URL format is:
 * https://docs.google.com/spreadsheets/d/{ID}/...
 *
 * @param {string} spreadsheetUrl - URL of google sheet.
 * @return {string} ID of spreadsheet.
 */
function ExtractSpreadsheetId(spreadsheetUrl) {
  var parts = spreadsheetUrl.split('/');
  return parts[5];
}

/**
 * Get all medium stories inside a google sheet.
 *
 * @param {string} spreadsheetUrl - URL of google sheet.
 * @param {function(Array)} callback - called when spreadsheet data is
 *   retrieved.
 */
function GetPostsFromSpreadsheet(spreadsheetUrl, callback) {
  var spreadsheetId = ExtractSpreadsheetId(spreadsheetUrl);

  // Retrieve spreadsheet feed url, it contains spreadsheet data as XML.
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://spreadsheets.google.com/feeds/cells/' + spreadsheetId + '/od6/private/full', true);


  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {

      if (xhr.status === 200) {
        var posts = GetEntriesFromSpreadsheet(xmlToJson(xhr.responseXML));
        callback(posts, true);
      } else {
        callback([], false);
        // TBD: print error invalid spreadsheet link. Check that link is valid and you are logged in.
      }
    }
  };

  xhr.overrideMimeType('text/xml');
  xhr.send();
}

/**
 * Extract data from a given medium story. Example: <id, author, ..>
 *
 * @param {string} postUrl - URL of medium story.
 * @param {function(Object)} callback - called when data is fetched from story.
 */
function GetDataFromPostUrl(postUrl, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', postUrl, true);

  var postId = '';
  var authorName = '';
  var authorId = '';

  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      // Get post id from page source. It's found as: <data-post-id="{id}">
      var postIdSplit = xhr.responseText.split('data-post-id="', 2);
      if (postIdSplit.length >= 2) {
        postId = postIdSplit[1].split('"', 1)[0];
      }
      // Get author id from page source. It's found as: <data-user-id="{id}">
      var authorIdSplit = xhr.responseText.split('data-user-id="', 2);
      if (authorIdSplit.length >= 2) {
        authorId = authorIdSplit[1].split('"', 1)[0];
      }
      // Get author name from page source. It's found as: <"creator":["{name}"]>
      var authorNameSplit = xhr.responseText.split('creator":["', 2);
      if (authorNameSplit.length >= 2) {
        authorName = authorNameSplit[1].split('"', 1)[0];
      }
      callback(postId, authorId, authorName);
    }
  };
  xhr.send();
}

/**
 * Get all required parameters to perform a request.
 *
 * @param {string} postUrl - URL of medium story.
 * @param {string} templateId - ID of email template to include in request.
 * @param {function(Object)} callback - called when all paremeters are fetched.
 */
function GetRequestParameters(postUrl, templateId, callback) {
  // Get saved Publication ID parameter.
  chrome.storage.sync.get(['pub_id'], function(pubIdResult) {
    // Get post parameters.
    GetDataFromPostUrl(postUrl, function(postId, authorId, authorName) {
      // Get default email template parameter.
      var storageLabel = 'template_' + templateId;
      chrome.storage.sync.get([storageLabel], function(template) {
        // Build message variables map.
        var map = {};
        map[FULL_NAME] = authorName;
        map[FIRST_NAME] = authorName.split(' ', 1)[0];

        callback({
          pid: postId,
          cid: pubIdResult.pub_id,
          uid: authorId,
          author: authorName,
          template: ReplaceMessageVariables(template[storageLabel], map)
        });
      });
    });
  });
}


/**
 * Send a "Request for publication" request for a certain medium story.
 *
 * @param {string} postUrl - URL of medium story.
 * @param {number} templateId - ID of email template to include in request.
 * @param {function(Object)} callback - called when request is sent.
 */
function SendRequest(postUrl, templateId, callback) {
  // Get required parameters needed for the request.
  GetRequestParameters(postUrl, templateId, function(data) {

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://medium.com/_/api/users/' + data.uid + '/requests', true);

    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
          // Get Response as JSON object from medium.
          // We remove the first 16 characters because they are garbage.
          var jsonResponse = JSON.parse(xhr.responseText.substring(16));
          callback(postUrl, jsonResponse);
      }
    };

    // Set headers needed to make the request successful.
    xhr.setRequestHeader('x-xsrf-token', 'xsrf');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.send(JSON.stringify({
      bidAmount: 0,
      bidCurrency: 1,
      collectionId: data.cid,
      comment: data.template,
      postId: data.pid,
      type: 'submit_post_to_publication'
    }));
    // renderStatus('<img src="loading.gif">');
  });
}

/**
 * Send a quick request for medium story in current tab.
 *
 * @param {number} templateId - ID of email template to include in request.
 * @param {function(Object)} callback - called when request is sent.
 */
function SendQuickRequest(templateId, callback) {
  GetTabUrl(function(postUrl) {
    SendRequest(postUrl, templateId, function(postUrl, response) {
      callback(response);
    });
  });
}

/**
 * Send a quick request for medium story in current tab.
 *
 * @param {string} postId - ID of requested medium post.
 * @param {number} templateId - ID of email template to include in request.
 * @param {function(Object)} callback - called when request is sent.
 */
function SendHomeQuickRequest(postId, templateId, callback) {
  var postUrl = 'https://medium.com/@elysian/' + postId;
  SendRequest(postUrl, templateId, function(postUrl, response) {
    callback(response);
  });
}

/**
 * Send requests for multiple posts as a batch.
 *
 * @param {Array} postsBatch - array of post urls to request.
 * @param {function(string, Object)} callback - called when request is sent.
 */
function SendBatchRequest(postsBatch, callback) {
  chrome.storage.sync.get(['default_template_id'], function(items) {
    var templateId = items.default_template_id;
    for (var post in postsBatch) {
      SendRequest(postsBatch[post], templateId, function(postUrl, jsonResponse) {
        var obj = {
          msg: 'post-processed',
          post: postUrl,
          response: jsonResponse
        };
        callback(postUrl, jsonResponse);
      });
    }
  });
}

/**
 * Send requests for all medium stories in a specific google sheet.
 *
 * @param {string} spreadsheetUrl - URL of google sheet.
 * @param {function(string, Object)} callback - called when request is sent.
 */
function SendSpreadsheetRequest(spreadsheetUrl, callback) {
  GetPostsFromSpreadsheet(spreadsheetUrl, function(posts, success) {
    if (!success) {
      var response = {
        success: false,
        error: 'Invalid sheet, make sure you are logged in.'
      };
      callback(spreadsheetUrl, response);
    } else {
      SendBatchRequest(posts, function(postUrl, response) {
        callback(postUrl, response);
      });
    }
  });
}

/**
 * Inject Origin header as "medium.com" for all requests going to "medium.com"
 * This is done to overcome bad Origin from requests going out of our extension.
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
function(details) {
  if (details.url.indexOf('://medium.com/') != -1) {
    for (var key in details.requestHeaders) {
      if (details.requestHeaders[key].name.toLowerCase() == 'origin') {
        details.requestHeaders[key].value = 'https://medium.com';
      }
    }
  }
  return { requestHeaders: details.requestHeaders };
},
{urls: ['<all_urls>']},
['blocking', 'requestHeaders']);

/**
 * Listener for messages coming from content scripts.
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // If quick request received from content script, do it.
  if (request.msg == 'quick-request') {
    SendQuickRequest(request.tmpid, function(response) {
      sendResponse(response);
    });
    return true;
    // Serve request coming from buttons on preview cards.
  } else if (request.msg == 'home-quick-request') {
    SendHomeQuickRequest(request.pid, request.tmpid, function(response) {
      sendResponse(response);
    });
    return true;
    // Return list of templates to content script.
  } else if (request.msg == 'get-templates') {
    GetTemplatesList(function(templatesList) {
      sendResponse(templatesList);
    });
    return true;
  }
});

/**
 * Set storage items to default values on a fresh installation.
 */
chrome.runtime.onInstalled.addListener(function() {
  // Set templates names to {Template 1, Template 2, ....}
  for (var i = 1; i <= TEMPLATE_COUNT; i++) {
    (function() {
      var templateId = i;
      var storageLabel = 'template_name_' + templateId;
      chrome.storage.sync.get([storageLabel], function(items) {
        // Only update template name if current value is 'undefined'.
        if (!items[storageLabel]) {
          var obj = {};
          obj[storageLabel] = 'Template ' + templateId;
          chrome.storage.sync.set(obj);
        }
      });
    }());
  }

  // Set templates contents to DEFAULT_TEMPLATE_CONTENT.
  for (var i = 1; i <= TEMPLATE_COUNT; i++) {
    (function() {
      var storageLabel = 'template_' + i;
      chrome.storage.sync.get([storageLabel], function(items) {
        // Only update template content if current value is 'undefined'.
        if (!items[storageLabel]) {
          var obj = {};
          obj[storageLabel] = DEFAULT_TEMPLATE_CONTENT;
          chrome.storage.sync.set(obj);
        }
      });
    }());
  }

  // Set default template id to 1.
  chrome.storage.sync.get(['default_template_id'], function(items) {
    // Only update default template id if current value is 'undefined'.
    if (!items.default_template_id) {
      chrome.storage.sync.set({'default_template_id': '1'});
    }
  });

  // Set default template content to DEFAULT_TEMPLATE_CONTENT.
  chrome.storage.sync.get(['default_template_content'], function(items) {
    // Only update default template content if current value is 'undefined'.
    if (!items.default_template_content) {
      chrome.storage.sync.set(
        {'default_template_content': DEFAULT_TEMPLATE_CONTENT}
      );
    }
  });

  // Set publication id to 0 and publication url to "https://medium.com/".
  chrome.storage.sync.get(['pub_id', 'pub_url'], function(items) {
    // Only update publication id if current value is 'undefined'.
    if (!items.pub_id) {
      chrome.storage.sync.set({'pub_id': '0'});
    }
    // Only update publication url if current value is 'undefined'.
    if (!items.pub_url) {
      chrome.storage.sync.set({'pub_url': 'https://medium.com/'});
    }
  });

  chrome.runtime.openOptionsPage();
});
