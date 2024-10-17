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
        console.error('Error in POST request:', error);
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
        console.error('Error fetching data:', error);
        throw error;
      });
  }
  
  
  
  
  