console.log("Content script loaded.");
let thautofillEnabled = true
const apiKey = '';
const gpt3 = new window.GPT3(apiKey)

async function getClipboardText() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        console.log("Clipboard text: " + clipboardText)
        return clipboardText;
    } catch (err) {
        console.error('Error reading clipboard:', err);
        return '';
    }
}

async function suggestThought(target) {
    console.log(document.body.innerText)
    // const clipboardText = await getClipboardText();

    let inputValue = ""
    if (target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA') {
        inputValue = target.value;
    } else {
        inputValue = target.textContent;
    }

    const messages = [
        {
            role: 'system',
            content: `
    You are the user! Generate autocomplete suggestions for input in various text fields.
    
    Your role is to help the user by suggesting creative and interesting thoughts based on the text they have typed so far (input_value key).

    Finish the user's sentences using proper grammar, punctuation, and structure. Ensure that you provide completed sentences or phrases, avoiding run-on sentences.

    If a space is needed before the suggested text to prevent it from merging with the user's current input_value, prepend a space to your suggestion.

    For example, if the user types "How to make a", your response might be '{"autocomplete": " pizza."}' or '{"autocomplete": " smoothie in 5 simple steps."}'.

    When the user selects a search input on a particular site, provide creative autocomplete suggestions to help them search for specific content. For instance, '{"autocomplete": " black hole mysteries."}' or '{"autocomplete": " underwater archaeological discoveries."}'.

    ONLY respond with JSON containing the "autocomplete" key.

    The "autocomplete" key is a string containing the user provided input_value PLUS the suggested text that the user will type.
    
    You are speaking as the user!
  `
        },

        {
            role: 'user',
            content: JSON.stringify({
                context: {
                    url: window.location.href,
                    website_content: document.body.innerText.slice(0, 2000),
                },
                // respond_to: '',
                input_value: inputValue,
                inputTitle: target.title || target.name || target.id,
                inputPlaceholder: target.placeholder,
                user_attributes: {
                    name: "Dave",
                    age: 31,
                    job: "game developer"
                }
            })
        }
    ]

    console.log(messages)

    try {
        const result = await gpt3.chatCompletion(messages, { max_tokens: 512 })
        // Use result in the DOM to auto-suggest words

        console.log(result)
        let json = JSON.parse(result[0].message.content)

        showSuggestion(target, json.autocomplete);

    } catch (error) {
        console.error('Error:', error.message)
    }
}


let suggestionElement = null;

function createSuggestionElement(text) {
    const div = document.createElement('div');
    div.id = 'thautofill-suggestion';
    div.textContent = text;
    div.style.cssText = `
    background-color: #f0f0f0;
    color: #333;
    border: 1px solid #ccc;
    padding: 4px 8px;
    font-size: 14px;
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    visibility: hidden;
    border-radius: 4px;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.25);
  `;
    return div;
}
function showSuggestion(target, text) {
    if (!suggestionElement) {
        suggestionElement = createSuggestionElement(text);
        document.body.appendChild(suggestionElement);
    } else {
        suggestionElement.textContent = text;
    }

    let rect = target.getBoundingClientRect();
    const suggestedTop = rect.top + window.scrollY - suggestionElement.offsetHeight;
    const suggestedLeft = rect.left + window.scrollX;

    // Add padding space
    const padding = 50;

    // Ensure the suggestion element stays on the screen vertically with padding
    const windowHeight = window.innerHeight;
    const suggestionHeight = suggestionElement.offsetHeight;
    const actualTop = Math.min(Math.max(padding, suggestedTop), windowHeight - suggestionHeight - padding);

    // Ensure the suggestion element stays on the screen horizontally with padding
    const windowWidth = window.innerWidth;
    const suggestionWidth = suggestionElement.offsetWidth;
    const actualLeft = Math.min(Math.max(padding, suggestedLeft), windowWidth - suggestionWidth - padding);

    suggestionElement.style.top = `${actualTop}px`;
    suggestionElement.style.left = `${actualLeft}px`;
    suggestionElement.style.visibility = 'visible';
}


/*
function showSuggestion(target, text) {
  if (!suggestionElement) {
    suggestionElement = createSuggestionElement(text);
    document.body.appendChild(suggestionElement);
  } else {
    suggestionElement.textContent = text;
  }

  console.log("suggestion: " + text);

  const rect = target.getBoundingClientRect();
  const suggestionRect = suggestionElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const top = rect.top + window.scrollY - suggestionRect.height;
  const bottom = rect.bottom + window.scrollY;
  const left = rect.left + window.scrollX;
  const right = rect.right - suggestionRect.width + window.scrollX;

  let targetTop = top >= 0 ? top : bottom;
  let targetLeft = left + (rect.width / 2) - (suggestionRect.width / 2);

  if (targetLeft + suggestionRect.width > viewportWidth) {
    targetLeft = viewportWidth - suggestionRect.width;
  }

  if (targetLeft < 0) {
    targetLeft = 0;
  }

  suggestionElement.style.top = `${targetTop}px`;
  suggestionElement.style.left = `${targetLeft}px`;
  suggestionElement.style.visibility = 'visible';
}
*/


function hideSuggestion() {
    if (suggestionElement) {
        suggestionElement.style.visibility = 'hidden';
    }
}


document.addEventListener("click", captureClick);

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (request) {
        if (request.action === "toggle_thautofill") {
            thautofillEnabled = !thautofillEnabled;
            alert("Thautofill is now " + (thautofillEnabled ? "enabled" : "disabled"));
        }
    });
});

chrome.runtime.sendMessage({ status: "content_script_loaded" })


document.addEventListener('keydown', (event) => {
    console.log(event.target)

    if (event.key === 'Tab' && suggestionElement && suggestionElement.style.visibility === 'visible') {
        event.preventDefault(); // Prevent default tab behavior

        if (event.target.tagName === 'INPUT'
            || event.target.tagName === 'TEXTAREA') {
            event.target.value += suggestionElement.textContent;
        } else {
            event.target.textContent += suggestionElement.textContent;

            // Move mouse cursor to end of contenteditable div
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(event.target);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    hideSuggestion();
});

// Use keyup event for Escape key
document.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') {
        hideSuggestion();
    }
});


function captureClick(event) {
    hideSuggestion();

    if (!thautofillEnabled) return

    if (event.target.tagName === 'INPUT'
        || event.target.tagName === 'TEXTAREA'
        || event.target.getAttribute('contenteditable') === 'true') {
        suggestThought(event.target);
    }
}


function keyPressed(event) {
    if (event.keyCode === 17) {
        // Logic to switch modals, and perform other tasks when pressing the control key.
    }
}

/*
function handleFocus(event) {
    const target = event.target;
    const isInputOrTextarea = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const isContentEditable = target.getAttribute('contenteditable') === 'true';

    if (thautofillEnabled && (isInputOrTextarea || isContentEditable)) {
        suggestThought(event.target);
    }
}

document.addEventListener('focus', handleFocus, true);
document.addEventListener('blur', handleBlur, true);
*/
