var bgPage = chrome.extension.getBackgroundPage();

/**
 * Clear contents of bottom section so they can be filled with posts labels.
 */
function PrepareContainerForRequest() {
  document.getElementById('bottom-container').innerHTML = '';
  var title = document.createElement('label');
  title.innerHTML = 'Requested Stories';
  document.getElementById('bottom-container').appendChild(title);
}

/**
 * Add label for each requested story attached with its status.
 */
function AddStoryLabel(postUrl, reponse) {
  var div = document.getElementById('bottom-container');
  // Add label for requested story.
  var label = document.createElement('input');
  label.className = 'status-input';
  label.value = postUrl;
  label.disabled = true;
  // Add success/failure image.
  var img = document.createElement('img');
  img.className = 'status-img';
  if (reponse.success) {
    img.title = 'Success!';
    img.src = 'images/success.png';
  } else {
    img.title = reponse.error;
    img.src = 'images/failure.png';
  }
  div.appendChild(label);
  div.appendChild(img);
}

/**
 * Add a medium story input box.
 */
function AddStoryInput() {
  var div = document.getElementById('extra-stories');
  var input = document.createElement('input');
  input.placeholder = 'Story ' + (div.childNodes.length + 2);
  input.id = 'story-' + (div.childNodes.length + 2);
  input.type = 'url';
  div.appendChild(input);
}

/**
 * Submit google spreadsheet.
 */
function SubmitSpreadsheet() {
  var sheet = document.getElementById('spreadsheet_url').value;
  PrepareContainerForRequest();
  bgPage.SendSpreadsheetRequest(sheet, function(postUrl, reponse) {
    AddStoryLabel(postUrl, reponse);
  });
}

/**
 * Submit all posts from input fields.
 */
function SubmitPosts() {
  var postsBatch = [];
  var i = 1;
  while (true) {
    var input = document.getElementById('story-' + i);
    if (!input) {
      break;
    }
    postsBatch.push(input.value);
    i++;
  }

  // Clear window content.
  PrepareContainerForRequest();

  // Add label for each requested post.
  bgPage.SendBatchRequest(postsBatch, function(postUrl, reponse) {
    AddStoryLabel(postUrl, reponse);
  });
}

/**
 * Execute when window is loaded.
 */
window.onload = function() {
  document.getElementById('submit-posts').addEventListener('click', SubmitPosts);
  document.getElementById('submit-spreadsheet').addEventListener('click',
    SubmitSpreadsheet);
  document.getElementById('settings').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('add-post').addEventListener('click', AddStoryInput);
}
