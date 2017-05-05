var btnSet = new Set();

/**
 * Make HTML code for templates select list.
 * @param {function(string)} callback - called when html code is formed.
 */
function GetTemplatesOptionsList(callback) {
	// Get default template id to mark it as selected by default.
	chrome.storage.sync.get(['default_template_id'], function(items) {
		// Get list of templates to background.
		chrome.runtime.sendMessage({msg: 'get-templates'}, function(templates) {
			var options;
			for (var i = 0; i < templates.length; i++) {
				var templateId = i + 1;
				// Make default template selected.
				if (items.default_template_id == templateId) {
					options += '<option value="' + templateId + '" selected>';
				} else {
					options += '<option value="' + templateId + '">';
				}
				options += templates[i];
				options += '</option>';
			}
			callback(options);
		});
    });
}

/**
 * Request story in current tab for publication.
 */
function RequestStory() {
	// Get selected value and hide Tempelate Selector.
	var select = document.getElementById('medium-plugin-request-button-select');
	var templateId = select.value;
	select.style.display = 'none';

	// Show loading image.
	var buttonImg = document.getElementById('medium-plugin-request-button-img');
	buttonImg.src = chrome.extension.getURL('images/loading.gif');
	buttonImg.style.display = 'inline-block';
	buttonImg.title = '';

	var msgObj = {
		msg: 'quick-request',
		tmpid: templateId
	};

	// Send request message to background.
	chrome.runtime.sendMessage(msgObj, function(response) {
		if (response.success) {
			// Show success image.
			buttonImg.src = chrome.extension.getURL('images/success.png');
			buttonImg.title = 'Email Sent successfully!';
		} else {
			// Show failure image.
			buttonImg.src = chrome.extension.getURL('images/failure.png');
			buttonImg.title = response.error;
		}
	});
}

/**
 * Request story from home page identified by post id.
 *
 * @param {string} postId - ID of requested post.
 */
function RequestHomeStory(postId) {
	// Hide Tempelate Selector.
	var select = document.getElementById('medium-plugin-request-button-select-' + postId);
	var templateId = select.value;
	select.style.display = 'none';

	// Show loading image.
	var buttonImg = document.getElementById('medium-plugin-request-button-img-' + postId);
	buttonImg.src = chrome.extension.getURL('images/loading.gif');
	buttonImg.style.display = 'inline-block';
	buttonImg.title = '';

	var msgObj = {
		msg: 'home-quick-request',
		pid: postId,
		tmpid: templateId
	};

	// Send request message to background.
	chrome.runtime.sendMessage(msgObj, function(response) {
		if (response.success) {
			// Show success image.
			buttonImg.src = chrome.extension.getURL('images/success.png');
			buttonImg.title = 'Email Sent successfully!';
		} else {
			// Show failure image.
			buttonImg.src = chrome.extension.getURL('images/failure.png');
			buttonImg.title = response.error;
		}
	});
}

/**
 * Insert 'Request Article' buttons into home page story previews.
 */
function AddButtonsToHomePage() {
	// Only add html elements if on medium page containing article cards.
	var allPosts = document.getElementsByClassName('postArticle--short');
	if (!allPosts) {
		return;
	}

	GetTemplatesOptionsList(function(options) {
		// Iterate over all post previews, add button to each one.
		for (var i = 0; i < allPosts.length; i++) {
			(function() {
				// Only add button to new stories.
				var postId = allPosts[i].getAttribute('data-post-id');
				if (btnSet.has(postId)) {
					return;
				}
				btnSet.add(postId);

				// Create Button element.
				var button = document.createElement('button');
				button.id = 'medium-plugin-request-story-' + postId;
				button.className = 'waves-effect waves-light btn green lighter-1 medium-plugin-home-request-button medium-plugin-button';
				button.innerHTML = 'Request Article';
				button.addEventListener('click', function() {
					RequestHomeStory(postId);
				});

				// Create labeled image beside button.
				var buttonImg = document.createElement('img');
				buttonImg.id = 'medium-plugin-request-button-img-' + postId;
				buttonImg.className = 'medium-plugin-home-request-button-img';

				// Create labeled image beside button.
				var select = document.createElement('select');
				select.id = 'medium-plugin-request-button-select-' + postId;
				select.className = 'waves-effect waves-light btn green lighter-1 medium-plugin-home-request-button medium-plugin-button medium-plugin-select';
				select.innerHTML = options;

				// Append beside author description in story card.
				for (var j = 0; j < allPosts[i].childNodes.length; j++) {
					if (allPosts[i].childNodes[j].className ==
						'u-clearfix u-marginBottom10') {
						allPosts[i].childNodes[j].appendChild(buttonImg);
						allPosts[i].childNodes[j].appendChild(select);
						allPosts[i].childNodes[j].appendChild(button);
						break;
					}
				}
			}());
		}
	});
}

/**
 * Insert 'Request Article' button into story page.
 */
function AddButtonToStoryPage() {
	// Get Position of injected button
	var buttonOnSite = document.querySelectorAll('[data-tracking-context]')[0];
	// Only add html elements if on medium story page
	if (buttonOnSite) {
		parent = buttonOnSite.parentElement;
		next = buttonOnSite.previousSibling;

		// Change header div style to attach button beside it.
		var headerDiv = document.getElementsByClassName('postMetaHeader')[0];
		// headerDiv.style.width = '75%';
		// headerDiv.style.display = 'inline-block';

		// Create Button element.
		var button = document.createElement('button');
		button.id = 'medium-plugin-request-story';
		button.className = 'waves-effect waves-light btn green lighter-1 medium-plugin-request-button medium-plugin-button';
		button.innerHTML = 'Request Article';
		button.addEventListener('click', RequestStory);

		// Create labeled image beside button.
		var select = document.createElement('select');
		select.id = 'medium-plugin-request-button-select';
		select.className = 'waves-effect waves-light btn green lighter-1 medium-plugin-request-button medium-plugin-button medium-plugin-select';

		// Create labeled image beside button.
		var buttonImg = document.createElement('img');
		buttonImg.id = 'medium-plugin-request-button-img';
		buttonImg.className = 'medium-plugin-request-button-img';

		GetTemplatesOptionsList(function(options) {
			select.innerHTML = options;
			headerDiv.appendChild(select);
			headerDiv.appendChild(buttonImg);
			headerDiv.appendChild(button);
		});
	}
}


/**
 * Execute when window is loaded.
 */
window.onload = function() {
	AddButtonToStoryPage();
	// Execute AddButtons function every 5 seconds to update new stories loaded
	// later (ex: stories added to page when you go to far bottom).
	setInterval(AddButtonsToHomePage, 5000);
}
