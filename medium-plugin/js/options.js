/**
 * Update saved medium publication ID from a given URL.
 *
 * @param {string} publicationUrl - URL of medium publication.
 */
function UpdatePublicationId(publicationUrl) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', publicationUrl, true);

  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      // Get publication id from page source.
      // It's found as: <data-collection-id="{id}">
      var responseSplit = xhr.responseText.split('data-collection-id="', 2);
      // If OK, store URL and ID of publication in chrome storage.
      if (responseSplit.length >= 2) {
        var publicationId = responseSplit[1].split('"', 1)[0];
        chrome.storage.sync.set({'pub_url': publicationUrl});
        chrome.storage.sync.set({'pub_id': publicationId});
        DisplaySuccessMessage('Updated default publication!');
      } else {      // Otherwise don't update and display an error message.
        DisplayErrorMessage('Publication not found!');
      }
    }
  };
  xhr.send();
}

/**
 * Update name of specific email template.
 *
 * @param {number} templateId - ID of email template to be updated.
 * @param {string} templateName - New name to update email template with.
 */
function UpdateTemplateName(templateId, templateName) {
  var storageLabel = 'template_name_' + templateId;
  var obj = {};
  obj[storageLabel] = templateName;
  chrome.storage.sync.set(obj);
}

/**
 * Update content of specific email template.
 *
 * @param {number} templateId - ID of email template to be updated.
 * @param {string} templateContent - New content to update email template with.
 */
function UpdateTemplateContent(templateId, templateContent) {
  var storageLabel = 'template_' + templateId;
  var obj = {};
  obj[storageLabel] = templateContent;
  chrome.storage.sync.set(obj);

  // If this is the default template, update default template content.
  chrome.storage.sync.get(['default_template_id'], function(items) {
    if (templateId == items.default_template_id) {
      UpdateDefaultTemplate(templateId);
    }
  });
}

/**
 * Update default email template used in request.
 *
 * @param {number} templateId - ID of default email template.
 */
function UpdateDefaultTemplate(templateId) {
  var storageLabel = 'template_' + templateId;
  // Save default email template id.
  chrome.storage.sync.set({'default_template_id': templateId});
  // Save default email template conent.
  chrome.storage.sync.get([storageLabel], function(items) {
    chrome.storage.sync.set({'default_template_content': items[storageLabel]});
  });
}

/**
 * Display success message on the floating bar.
 *
 * @param {string} message - message to display.
 */
function DisplaySuccessMessage(message) {
  document.getElementById('success-alert').style.display = 'none';
  document.getElementById('error-alert').style.display = 'none';

  document.getElementById('success-alert').style.display = 'block';
  document.getElementById('success-lbl').innerHTML = message;
}

/**
 * Display error message on the floating bar.
 *
 * @param {string} message - message to display.
 */
function DisplayErrorMessage(message) {
  document.getElementById('success-alert').style.display = 'none';
  document.getElementById('error-alert').style.display = 'none';

  document.getElementById('error-alert').style.display = 'block';
  document.getElementById('error-lbl').innerHTML = message;
}

/**
 * Save default publication URL.
 */
function SavePublication() {
  var publicationUrl = document.getElementById('publication_url').value;
  UpdatePublicationId(publicationUrl);
}

/**
 * Enable input box to edit template name.
 */
function EnterTemplateNameEditMode() {
  document.getElementById('edit-template-name').style.display = 'none';
  document.getElementById('template-name-input').disabled = false;
  document.getElementById('save-template-name').style.display = 'inline-block';
}

/**
 * Update selected template in dropdown menu with the name inside the input box.
 */
function UpdateSelectedTemplateName() {
  var templateId = document.getElementById('template-select').value;
  var templateName = document.getElementById('template-name-input').value;
  UpdateTemplateName(templateId, templateName);
  DisplaySuccessMessage('Template ' + templateId + ' title updated!');

  document.getElementById('edit-template-name').style.display = 'inline-block';
  document.getElementById('template-name-input').disabled = true;
  document.getElementById('save-template-name').style.display = 'none';
}

/**
 * Update selected template in dropdown menu with the content inside the
 * textarea.
 */
function UpdateSelectedTemplateContent() {
  var templateId = document.getElementById('template-select').value;
  var templateContent = document.getElementById('textarea1').value;
  UpdateTemplateContent(templateId, templateContent);
  DisplaySuccessMessage('Template ' + templateId + ' updated!');
}

/**
 * Set selected template in dropdown menu as default.
 */
function SetSelectedTemplateAsDefault() {
  var templateId = document.getElementById('template-select').value;
  UpdateDefaultTemplate(templateId);
  DisplaySuccessMessage('Template ' + templateId + ' is now default template!');
}

/**
 * Execute when window is loaded.
 */
window.onload = function() {
  chrome.storage.sync.get(['pub_url'], function(items) {
    document.getElementById('publication_url').value = items.pub_url;
  });

  // Let default template to be selected automatically on loading.
  chrome.storage.sync.get(['default_template_id'], function(templateId) {
    var selectObj = document.getElementById('template-select');
    selectObj.value = templateId.default_template_id;
    // Since the dropdown <select> menu is wrapped, we should update the wrapper
    // value too.
    var selectWrapper = document.getElementsByClassName('select-wrapper')[0]
        .childNodes[1];
    selectWrapper.value = selectObj.options[selectObj.selectedIndex].text;

    // Set default template content and name input box value.
    var templateContentLabel = 'template_' + templateId.default_template_id;
    var templateNameLabel = 'template_name_' + templateId.default_template_id;
    chrome.storage.sync.get([templateContentLabel, templateNameLabel], function(items) {
      document.getElementById('textarea1').value =
          items[templateContentLabel];
      document.getElementById('template-name-input').value =
          items[templateNameLabel];

    });
  });

  // Change textarea content and name input box when selected template is
  // changed from dropdown menu.
  var selectObj = document.getElementById('template-select');
  selectObj.onchange = function() {
    var templateId = selectObj.value;
    var templateContentLabel = 'template_' + templateId;
    var templateNameLabel = 'template_name_' + templateId;
    chrome.storage.sync.get([templateContentLabel, templateNameLabel], function(items) {
      document.getElementById('textarea1').value =
          items[templateContentLabel];
      document.getElementById('template-name-input').value =
          items[templateNameLabel];
    });
  };

  document.getElementById('save-publication').addEventListener('click',
    SavePublication);
  document.getElementById('save-template').addEventListener('click',
    UpdateSelectedTemplateContent);
  document.getElementById('set-template-default').addEventListener('click',
    SetSelectedTemplateAsDefault);
  document.getElementById('edit-template-name').onclick = function() {
    return false;     // Prevent href default behavior
  };
  document.getElementById('edit-template-name').addEventListener('click',
    EnterTemplateNameEditMode);
  document.getElementById('save-template-name').addEventListener('click',
    UpdateSelectedTemplateName);
  document.getElementById('success-closebtn').addEventListener('click', function() {
    this.parentElement.style.display = 'none';
  });
  document.getElementById('error-closebtn').addEventListener('click', function() {
    this.parentElement.style.display = 'none';
  });

}
