const clipboardIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
</svg>`

// change settings of marked from default to remove deprecation warnings
// see conversation here: https://github.com/markedjs/marked/issues/2793
marked.use({
  mangle: false,
  headerIds: false
});

function autoFocusInput() {
  const userInput = document.getElementById('user-input');
  userInput.focus();
}

function generateShortUUID() {
  // Generate a short UUID
  const uuid = Math.random().toString(36).substring(2, 9);

  // Return the generated UUID
  return uuid;
}

function updateChatIdInQueryString(chatId) {
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set('uuid', chatId);
  window.history.replaceState({}, '', `?${searchParams.toString()}`);
}

function populateChatsList() {
  const chats = JSON.parse(localStorage.getItem('chats'));
  if (!chats) {
    return;
  }
  const chatsDiv = document.getElementById('chats-list');
  chatsDiv.innerHTML = '';
  chats.reverse().forEach((chatId) => {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-list-item';
    chatDiv.innerText = chatId;
    // change the uuid searchParam to the chatId on click 
    chatDiv.addEventListener('click', () => {
      updateChatIdInQueryString(chatId);

      showChatHistory();
    })
    chatsDiv.appendChild(chatDiv);
  })
}


function showChatHistory() {
  const searchParams = new URLSearchParams(window.location.search);
  const chatId = searchParams.get('uuid');

  if (!chatId) {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("uuid", generateShortUUID());
    
    // replace current url without reload
    let newPathWithQuery = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState(null, '', newPathWithQuery);
    return;
  }

  if (!localStorage.getItem(chatId)) {
    return;
  }

  const chatHistory = JSON.parse(localStorage.getItem(chatId));

  document.getElementById('chat-container').style.display = 'block';
  const chatHistoryDiv = document.getElementById('chat-history');
  chatHistoryDiv.innerHTML = '';

  chatHistory.forEach((chat) => {
    chatHistoryDiv.context = chat.context;

    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'mb-2 user-message text-end';
    userMessageDiv.innerText = chat.userInput;
    chatHistoryDiv.appendChild(userMessageDiv);

    const responseDiv = document.createElement('div');
    responseDiv.className = 'response-message mb-2 text-start';
    responseDiv.style.minHeight = '3em';
    responseDiv.innerText = chat.response;
    chatHistoryDiv.appendChild(responseDiv);
  })
}

/*
takes in model as a string
updates the query parameters of page url to include model name
*/
function updateModelInQueryString(model) {
  // make sure browser supports features
  if (window.history.replaceState && 'URLSearchParams' in window) {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("model", model);
    searchParams.set("uuid", generateShortUUID());
    
    // replace current url without reload
    let newPathWithQuery = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState(null, '', newPathWithQuery);
  }
}

// Fetch available models and populate the dropdown
async function populateModels() {
  document.getElementById('send-button').addEventListener('click', submitRequest);

  try {
    const response = await fetch("http://localhost:11434/api/tags");
    const data = await response.json();

    const selectElement = document.getElementById('model-select');

    // set up handler for selection
    selectElement.onchange = (() => updateModelInQueryString(selectElement.value));

    data.models.forEach((model) => {
      const option = document.createElement('option');
      option.value = model.name;
      option.innerText = model.name;
      selectElement.appendChild(option);
    });

    // select option present in url parameter if present
    const queryParams = new URLSearchParams(window.location.search);
    const requestedModel = queryParams.get('model');
    // update the selection based on if requestedModel is a value in options
    if ([...selectElement.options].map(o => o.value).includes(requestedModel)) {
      selectElement.value = requestedModel;
    }
    // otherwise set to the first element if exists and update URL accordingly
    else if (selectElement.options.length) {
      selectElement.value = selectElement.options[0].value;
      updateModelInQueryString(selectElement.value);
    }
  }
  catch (error) {
    console.error(error);
  }
}

// adjusts the padding at the bottom of scrollWrapper to be the height of the input box
function adjustPadding() {
  const inputBoxHeight = document.getElementById('input-area').offsetHeight;
  const scrollWrapper = document.getElementById('scroll-wrapper');
  scrollWrapper.style.paddingBottom = `${inputBoxHeight + 15}px`;
}

// sets up padding resize whenever input box has its height changed
const autoResizePadding = new ResizeObserver(() => {
  adjustPadding();
});
autoResizePadding.observe(document.getElementById('input-area'));


// Function to get the selected model
function getSelectedModel() {
  return document.getElementById('model-select').value;
}

function clearChat() {
  const chatHistory = document.getElementById('chat-history');
  chatHistory.innerHTML = '';
}

function newChat() {
  clearChat();
  document.getElementById('chat-container').style.display = 'block';

  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set("uuid", generateShortUUID());
    
  // replace current url without reload
  let newPathWithQuery = `${window.location.pathname}?${searchParams.toString()}`
  window.history.replaceState(null, '', newPathWithQuery);
}

// variables to handle auto-scroll
// we only need one ResizeObserver and isAutoScrollOn variable globally
// no need to make a new one for every time submitRequest is called
const scrollWrapper = document.getElementById('scroll-wrapper');
let isAutoScrollOn = true;
// autoscroll when new line is added
const autoScroller = new ResizeObserver(() => {
  if (isAutoScrollOn) {
    scrollWrapper.scrollIntoView({ behavior: "smooth", block: "end" });
  }
});

// event listener for scrolling
let lastKnownScrollPosition = 0;
let ticking = false;
document.addEventListener("scroll", (event) => {
  // if user has scrolled up and autoScroll is on we turn it off
  if (!ticking && isAutoScrollOn && window.scrollY < lastKnownScrollPosition) {
    window.requestAnimationFrame(() => {
      isAutoScrollOn = false;
      ticking = false;
    });
    ticking = true;
  }
  // if user has scrolled nearly all the way down and autoScroll is disabled, re-enable
  else if (!ticking && !isAutoScrollOn &&
    window.scrollY > lastKnownScrollPosition && // make sure scroll direction is down
    window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 30 // add 30px of space--no need to scroll all the way down, just most of the way
  ) {
    window.requestAnimationFrame(() => {
      isAutoScrollOn = true;
      ticking = false;
    });
    ticking = true;
  }
  lastKnownScrollPosition = window.scrollY;
});

// Function that saves the current chat in the browser local storage
function saveChat(userInput, response, context) {
  const chat = {
    context: context,
    userInput: userInput,
    response: response
  };
  const searchParams = new URLSearchParams(window.location.search);
  const chatId = searchParams.get('uuid');

  if (!localStorage.getItem(chatId)) {
    localStorage.setItem(chatId, '[]');
  }

  const chatHistory = JSON.parse(localStorage.getItem(chatId));
  chatHistory.push(chat);
  localStorage.setItem(chatId, JSON.stringify(chatHistory));

  if (!localStorage.getItem('chats')) {
    localStorage.setItem('chats', '[]');
  } 

  const chats = JSON.parse(localStorage.getItem('chats'));
  if (chats.includes(chatId)) {
    return;
  }
  chats.push(chatId);
  localStorage.setItem('chats', JSON.stringify(chats));

  populateChatsList();
}

// Function to handle the user input and call the API functions
async function submitRequest() {
  document.getElementById('chat-container').style.display = 'block';

  const input = document.getElementById('user-input').value;
  const selectedModel = getSelectedModel();
  const context = document.getElementById('chat-history').context;
  const data = { model: selectedModel, prompt: input, context: context };

  // Create user message element and append to chat history
  let chatHistory = document.getElementById('chat-history');
  let userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'mb-2 user-message text-end';
  userMessageDiv.innerText = input;
  chatHistory.appendChild(userMessageDiv);

  // Create response container
  let responseDiv = document.createElement('div');
  responseDiv.className = 'response-message mb-2 text-start';
  responseDiv.style.minHeight = '3em'; // make sure div does not shrink if we cancel the request when no text has been generated yet
  spinner = document.createElement('div');
  spinner.className = 'spinner-border text-light';
  spinner.setAttribute('role', 'status');
  responseDiv.appendChild(spinner);
  chatHistory.appendChild(responseDiv);

  // create button to stop text generation
  let interrupt = new AbortController();
  let stopButton = document.createElement('button');
  stopButton.className = 'btn btn-danger';
  stopButton.innerHTML = 'Stop';
  stopButton.onclick = (e) => {
    e.preventDefault();
    interrupt.abort('Stop button pressed');
  }
  // add button after sendButton
  const sendButton = document.getElementById('send-button');
  sendButton.insertAdjacentElement('beforebegin', stopButton);

  // change autoScroller to keep track of our new responseDiv
  autoScroller.observe(responseDiv);

  postRequest(data, interrupt.signal)
    .then(async response => {
      await getResponse(response, parsedResponse => {
        console.log(response, parsedResponse)
        let word = parsedResponse.response;
        if (parsedResponse.done) {
          chatHistory.context = parsedResponse.context;
          // Copy button
          let copyButton = document.createElement('button');
          copyButton.className = 'btn btn-secondary copy-button';
          copyButton.innerHTML = clipboardIcon;
          copyButton.onclick = () => {
            navigator.clipboard.writeText(responseDiv.hidden_text).then(() => {
              console.log('Text copied to clipboard');
            }).catch(err => {
              console.error('Failed to copy text:', err);
            });
          };
          responseDiv.appendChild(copyButton);

          saveChat(input, responseDiv.hidden_text, parsedResponse.context);
        }
        // add word to response
        if (word != undefined) {
          if (responseDiv.hidden_text == undefined) {
            responseDiv.hidden_text = "";
          }
          responseDiv.hidden_text += word;
          responseDiv.innerHTML = DOMPurify.sanitize(marked.parse(responseDiv.hidden_text)); // Append word to response container
        }
      });
    })
    .then(() => {
      stopButton.remove(); // Remove stop button from DOM now that all text has been generated
      spinner.remove();
    })
    .catch(error => {
      if (error !== 'Stop button pressed') {
        console.error(error);
      }
      stopButton.remove();
      spinner.remove();
    });

  // Clear user input
  document.getElementById('user-input').value = '';
}

// Event listener for Ctrl + Enter or CMD + Enter
document.getElementById('user-input').addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    submitRequest();
  }
});

document.getElementById('new-chat-button').addEventListener('click', newChat);


window.onload = () => {
  populateModels();
  adjustPadding();
  autoFocusInput();
  showChatHistory();
  populateChatsList();
}