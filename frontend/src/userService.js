import { API } from './config.js';
import { get } from './helpers.js';



export function getProfile(userId) {
    return get(API + "/user", { userId }, localStorage.getItem('token'))
        .then(data => {
            if (data) {
                return data;
            } else {
                throw new Error("No profile found for the given ID");
            }
        })
        .catch(error => {
            throw error;
        });
}

