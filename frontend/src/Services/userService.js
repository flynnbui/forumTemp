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

export function setupProfile(author) {
    clearThreadContainer();
    var template = document.getElementById("showProfile");
    var clone = template.content.cloneNode(true);

    if (author.image) {
        clone.querySelector('#profileAvatar').src = author.image;
    }
    clone.querySelector('#profileName').textContent = author.name;
    clone.querySelector('#profileEmail').textContent = author.email;

    const threadContainer = document.getElementById("threadContainer");
    threadContainer.appendChild(clone);

    if (Array.isArray(author.threadsWatching)) {
        watchees = author.threadsWatching;
    } else if (author.threadsWatching && author.threadsWatching.length > 0) {
        try {
            const parsedWatchees = JSON.parse(thread.watchees);
            watchees = Array.isArray(parsedWatchees) ? parsedWatchees : [parsedWatchees];
        } catch (error) {
            console.error("Error parsing watchees:", error);
            watchees = [];
        }
    }

    watchees.forEach(threadId => {
        populateWatchList(threadId);
    });

}

function populateWatchList(thread) {
    clearContainer("watchThreadBox");
    fetchThread(id)
        .then(response => createThreadListItem(response.threadDetails, response.authorDetails, "watchThreadBox"))
        .catch(error => {
            console.error('Error displaying thread in watchBox:', error);
        });
}

function populateOwnedThread(thread) {
    clearContainer("ownedThreadBox");
    fetchThread(id)
        .then(response => createThreadListItem(response.threadDetails, response.authorDetails, "ownedThreadBox"))
        .catch(error => {
            console.error('Error displaying thread in watchBox:', error);
        });
}

function createProfileThreadItem(thread, author, placeholder) {
    var template = document.getElementById("profileThreadItem");
    var clone = template.content.cloneNode(true);

    const threadItem = clone.querySelector(".profileThreadItem");
    threadItem.id = thread.id;

    clone.querySelector('.profileThreadTitle').textContent = thread.title;
    clone.querySelector('.profileThreadAuthor').textContent = author.name;
    let likeString = thread.likes.length != 1 ? "likes" : "like";
    clone.querySelector(".threadTime").textContent = `${formatDate(thread.createdAt)} | ${thread.likes.length} ` + likeString;

    const watchContainer = document.getElementById(placeholder);
    watchContainer.appendChild(clone);

    threadItem.addEventListener('click', () => {
        fetchThread(thread.id)
            .then(response => {
                setupThreadDetail(response.threadDetails, response.authorDetails);
            })
            .catch(error => {
                console.error(error);
            });
    });
}
function clearContainer(placeholder) {
    const watchContainer = document.getElementById(placeholder);
    watchContainer.replaceChildren();
}