import { API, USER_DETAIL_KEY, TOKEN_KEY, USER_KEY } from '../config.js';
import { post, showPage } from '../helpers.js';
import { getThreadList, removeThreadList } from './threadService.js';
import { getProfile } from './userService.js';


export function storeSession(token, userID, userDetail) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, userID);
    localStorage.setItem(USER_DETAIL_KEY, JSON.stringify(userDetail));
}

export function login(email, password) {
    return post(API + "/auth/login", { email, password })
        .then(response => {
            if (response.token) {
                getProfile(response.userId, response.token)
                    .then(userDetail => {
                        storeSession(response.token, response.userId, userDetail);
                        console.log('Token stored successfully.');
                        getThreadList(0);
                        showPage('forumPage');
                    })
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
                if (response.token) {
                    getProfile(response.userId, response.token)
                        .then(userDetail => {
                            storeSession(response.token, response.userId, userDetail);
                            console.log('Token stored successfully.');
                            showPage('forumPage');
                            getThreadList(0);
                            resolve(response);
                        })
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
    localStorage.removeItem(USER_DETAIL_KEY);
    removeThreadList();
    showPage('loginPage');
}

