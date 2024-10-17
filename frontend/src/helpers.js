/**
 * Given a js file object representing a jpg or png image, such as one taken
 * from a html file input element, return a promise which resolves to the file
 * data as a data url.
 * More info:
 *   https://developer.mozilla.org/en-US/docs/Web/API/File
 *   https://developer.mozilla.org/en-US/docs/Web/API/FileReader
 *   https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
 * 
 * Example Usage:
 *   const file = document.querySelector('input[type="file"]').files[0];
 *   console.log(fileToDataUrl(file));
 * @param {File} file The file to be read.
 * @return {Promise<string>} Promise which resolves to the file as a data url.
 */
export function fileToDataUrl(file) {
  const validFileTypes = ['image/jpeg', 'image/png', 'image/jpg']
  const valid = validFileTypes.find(type => type === file.type);
  // Bad data, let's walk away.
  if (!valid) {
    throw Error('provided file is not a png, jpg or jpeg image.');
  }

  const reader = new FileReader();
  const dataUrlPromise = new Promise((resolve, reject) => {
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
  });
  reader.readAsDataURL(file);
  return dataUrlPromise;
}


export function post(url, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requestOptions = {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  };

  return fetch(url, requestOptions)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    })
    .catch(error => {
      throw error;
    });
};


export function get(url, query = null, token = null) {
  let requestURL = url;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (query !== null) {
    const queryString = new URLSearchParams(query).toString();
    requestURL += `?${queryString}`;
    console.log(requestURL);
  }

  const requestOptions = {
    method: 'GET',
    headers: headers,
  };

  return fetch(requestURL, requestOptions)
    .then(response => {
      return response.json();
    })
    .then(data => {
      return data;
    })
    .catch(error => {
      throw error;
    });
}

export function showPage(pageId) {
  document.querySelectorAll('#loginPage, #registerPage, #forumPage').forEach(page => {
    page.classList.remove('active');
  });

  const pageElement = document.getElementById(pageId);
  pageElement.classList.add('active');
}

export function showErrorMessage(message, placeHolder) {
  var template = document.getElementById('warningBox');
  var clone = template.content.cloneNode(true);

  var messageSpan = clone.querySelector('.warningMessage');
  messageSpan.textContent = message;

  var closeButton = clone.querySelector('.warningButton');
  closeButton.addEventListener('click', function () {
    var warningBox = closeButton.closest('div[role="alert"]');
    if (warningBox) {
      warningBox.remove();
    }
  });

  var warningContainer = document.getElementById(placeHolder);
  // Remove the old error box
  if (warningContainer) {
    warningContainer.replaceChildren();
  }
  // Append the error box to the placeholder container
  warningContainer.appendChild(clone);
}

export function formatDate(dateString) {
  console.log(dateString);
  const date = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}



