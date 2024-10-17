import { API } from './config.js';
import { TOKEN_KEY, USER_KEY } from './config.js';
import { post, showPage } from './helpers.js';

export function storeSession(token, userID) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, userID);
}

export function login(email, password) {
    return post(API + "/auth/login", { email, password })
        .then(response => {
            const { token, userId } = response;
            if (token) {
                storeSession(token, userId);
                console.log('Token stored successfully.');
                showPage('forumPage');
            } else {
                throw new Error('No token returned from server');
            }
        });
}

export function register(email, name, password, confirmPassword) {
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
                    showPage('forumPage');
                } else {
                    reject(new Error(response.error));
                }
            })
            .catch(error => reject(error));
    });
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    showPage('loginPage');
}

