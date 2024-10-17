import { BACKEND_PORT } from './config.js';
import { fileToDataUrl, post, get } from './helpers.js';

console.log("Let's go!");
// Constant
const TOKEN_KEY = "token";
const USER_KEY = "user";
const START_KEY = "start"; // Number of threads already loaded
const API = `http://localhost:${BACKEND_PORT}`;

let threadList = [];

function storeSession(token, userID) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, userID);
}

function removeSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  showPage('login-page');
}

function showPage(pageId) {
  document.querySelectorAll('#login-page, #register-page, #forum-page').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById(pageId).classList.add('active');
}

function toggleThreadPage(pageId) {
  switch (pageId) {
    case 'showthread':
      document.querySelectorAll('#newThread, #editThread, #showThread').forEach(page => {
        page.classList.remove('active');
      });
      document.getElementById(pageId).classList.add('active');
      break;

    case 'clear':
      document.querySelectorAll('#newThread, #editThread, #showThread').forEach(page => {
        page.classList.remove('active');
      });
      break;

    default:
      document.querySelectorAll('#newThread, #editThread, #showThread').forEach(page => {
        page.classList.remove('active');
      });
      document.getElementById(pageId).classList.add('active');
      break;
  }
}

function clearThreadPage() {
  document.querySelectorAll('#newThread, #editThread, #showThread').forEach(page => {
    page.classList.remove('active');
  });
}

function toggleNewThread() {
  document.querySelectorAll('#newThread, #editThread, #showThread').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById("newThread").classList.add('active');

  const cancelButton = document.getElementById("cancel");
  const postButton = document.getElementById("post");

  cancelButton.addEventListener("click", () => {
    clearThreadPage();
  })
  postButton.addEventListener("click", () => {
    const threadTitle = document.getElementById("newTitle").value;
    const radios = document.querySelectorAll('input[name="newVisibility"]');;
    const threadContent = document.getElementById("newContent").value;

    let threadVisibility;
    radios.forEach(radio => {
      if (radio.checked) {
        threadVisibility = Boolean(radio.value);
      }
    });
    newThread(threadTitle, threadVisibility, threadContent)
      .catch(error => console.error(error))
  })

}



function showMessage(message, placeHolder) {
  var warningBoxHTML = `
  <div id="warning-box" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-3" role="alert">
    <strong class="font-bold">Error!</strong>
    <span class="block sm:inline">${message}</span>
    <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
      <svg class="fill-current h-4 w-4 text-red-500" role="button" id="warningButton"
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <title>Close</title>
        <path
          d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"
        />
      </svg>
    </span>
  </div>
  `;

  // Select the container where the warning box will be added
  var warningContainer = document.getElementById(placeHolder);
  warningContainer.innerHTML = warningBoxHTML;

  // Set up the click event listener for the close button
  document.getElementById('warningButton').addEventListener('click', function () {
    var warningBox = document.getElementById('warning-box');
    if (warningBox) {
      warningBox.remove();
    }
  });
}

function login(email, password) {
  return post(API + "/auth/login", { email, password })
    .then(response => {
      const { token, userId } = response;
      if (token) {
        storeSession(token, userId);
        console.log('Token stored successfully.');
        showPage('forum-page');
      } else {
        throw new Error('No token returned from server');
      }
    });
}

function register(email, name, password, confirmPassword) {
  return new Promise((resolve, reject) => {
    if (password !== confirmPassword) {
      reject(new Error("Passwords do NOT match!"));
      return;
    }

    post(API + "/auth/register", { email, password, name })
      .then(response => {
        const { token, userId } = response;
        if (token) {
          storeSession(token, userId);
          console.log('Token stored successfully.');
          resolve(response);
          showPage('forum-page');
        } else {
          reject(new Error('No token returned from server'));
        }
      })
      .catch(error => reject(error));
  });
}

function newThread(title, isPublic, content) {
  return post(API + "/thread", { title, isPublic, content }, localStorage.getItem(TOKEN_KEY))
    .then(response => {
      console.log(response);
      if (!response.error) {
        const { id } = response;
        console.log(`Post ${id} new thread successfully!`);
        populateThreadList(id);
      } else {
        throw new Error("No thread's id returned from server");
      }
    })
}

function isSession() {
  if (localStorage.getItem(TOKEN_KEY)) {
    showPage("forum-page");
    getThreadList();
  }
  else {
    showPage("login-page");
  }
}


function getAuthor(userId) {
  return get(API + "/user", { userId }, localStorage.getItem('token'))
    .then(data => {
      const { id, email, name, image, admin } = data;
      if (name) {
        return name;
      } else {
        throw new Error("No name found for the given ID");
      }
    })
    .catch(error => {
      console.error('Error fetching author:', error);
      return null;
    });
}

function getProfile(userId) {
  return get(API + "/user", { userId }, localStorage.getItem('token'))
    .then(data => {
      console.log(data);
      const { id, email, name, image, admin } = data;
      if (name) {
        return { id, email, name, image, admin };
      } else {
        throw new Error("No profile found for the given ID");
      }
    })
    .catch(error => {
      console.error('Error fetching profile:', error);
      return null;
    });
}

function getThreadList() {
  const start = parseInt(localStorage.getItem("start"), 10) || 0;
  return get(API + "/threads", { start }, localStorage.getItem(TOKEN_KEY))
    .then(response => {
      if (response.error) {
        throw new Error(response.error);
      } else {
        if (response.length > 0) {
          response.forEach(thread => {
            populateThreadList(thread);
          });

          localStorage.setItem("start", start + response.length);
        }
      }
    });
}

function getThread(id) {
  return get(API + "/thread", { id: id }, localStorage.getItem('token'))
    .then(data => {
      const { id, title, content, creatorId } = data;
      if (id) {
        return { id, title, content, creatorId };
      } else {
        throw new Error(data.error);
      }
    })
    .catch(error => {
      console.error('Error fetching thread:', error);
      return null;
    });
}

function populateThreadList(id) {
  getThread(id)
    .then(thread => {
      if (!thread) {
        return Promise.reject('Failed to retrieve thread');
      }
      return getAuthor(thread.creatorId).then(author => {
        if (!author) {
          return Promise.reject(thread.error);
        }
        createThreadElement(thread);
      });
    })
    .catch(error => {
      console.error('Error displaying thread:', error);
    });
}
function createThreadElement(thread) {
  var threadBoxHTML = 
    `<a id="${thread.id}" class="block bg-gray-800 p-4 hover:bg-gray-700">
        <div class="flex justify-between flex-col">
            <h3 class="text-lg text-indigo-400 font-semibold">${thread.title}</h3>
            <span class="text-sm text-gray-400">Posted by ${author}</span>
        </div>
        <p class="text-gray-200 mt-2 truncated">${thread.content}</p>
        <div class="mt-3 flex justify-between items-center">
        </div>
      </a>
    <!-- Vertical Line Separator -->
    <div class="w-full h-px bg-gray-500"></div>`;

  const threadContainer = document.getElementById("threadContainer");
  threadContainer.innerHTML += threadBoxHTML;
}

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const logoutButton = document.getElementById("logout");
  const homeButton = document.getElementById("home");
  const addButton = document.querySelectorAll("add");

  isSession();

  // Toggle between login and register pages
  document.querySelector("a[href='#register']").addEventListener("click", function (event) {
    showPage('register-page');
  });

  document.querySelector("a[href='#login']").addEventListener("click", function (event) {
    event.preventDefault();
    showPage('login-page');
  });


  // Handle login form submission
  loginForm.addEventListener('submit', (e) => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    login(email, password)
      .catch(error => {
        console.error('Error logging in:', error);
        showMessage(`${error.message}`, "login-error");
      });
    e.preventDefault();
  });


  // Handle register form submission
  registerForm.addEventListener('submit', (e) => {
    const email = document.getElementById('register-email').value;
    const name = document.getElementById('register-name').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    register(email, name, password, confirmPassword)
      .catch(error => {
        console.error('Error signing up:', error);
        showMessage(`${error.message}`, "register-error");
      })
    e.preventDefault();
  })

  logoutButton.addEventListener('click', removeSession);

  document.querySelectorAll(".home").forEach(button => {
    button.addEventListener('click', () => {
      clearThreadPage();
    });
  });

  document.querySelectorAll(".add").forEach(button => {
    button.addEventListener('click', () => {
      toggleNewThread();
    });
  });


});
