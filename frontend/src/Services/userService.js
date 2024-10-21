import { API } from '../config.js';
import { get } from '../helpers.js';
import { NetworkError } from '../Exceptions/NetworkError.js';

const cacheKey = 'profileCache';
const expirationTime = 60 * 1000;


// Load cache from localStorage
function loadCache() {
    const cachedData = localStorage.getItem(cacheKey);
    return cachedData ? JSON.parse(cachedData) : {};
}

// Save the cache back to localStorage
function saveCache(cache) {
    localStorage.setItem(cacheKey, JSON.stringify(cache));
}

// Fetch profile from server and update cache
export function fetchProfile(userId) {
    const cache = loadCache();

    return getProfile(userId).then(profile => {
        cache[userId] = {
            profile: profile,
        };
        saveCache(cache);
        return profile;
    }).catch(error => {
        if (error instanceof NetworkError) {
            // If a network error occurs, extend cache for this user if available
            if (cache[userId]) {
                console.warn(`Network error, returning cached profile for user ${userId}.`);
                saveCache(cache);
                return cache[userId].profile;
            }
        }
        throw error;
    });
}

export function getProfile(userId, token = localStorage.getItem('token')) {
    return get(API + "/user", { userId }, token)
        .then(data => {
            if (data) {
                return data;
            } else {
                throw new Error("No profile found for the given ID");
            }
        })
        .catch(error => {
            console.error(`Failed to fetch profile for user ${userId}:`, error);
            throw error;
        });
}


