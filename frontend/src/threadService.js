import { API } from './config.js';
import { TOKEN_KEY, USER_KEY } from './config.js';
import { post, get, showErrorMessage, formatDate } from './helpers.js';
import { getProfile } from './userService.js';



async function newThread(title, isPublic, content) {
    try {
        const response = await post(API + "/thread", { title, isPublic, content }, localStorage.getItem(TOKEN_KEY));
        if (!response.error) {
            const { id } = response;
            console.log(`Post ${id} new thread successfully!`);
            // getThreadList(0);
            return id;
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        throw error;
    }
}

export function setupNewThread() {
    clearThreadContainer();
    const template = document.getElementById("newThread");
    const clone = template.content.cloneNode(true);

    const threadContainer = document.getElementById("threadContainer");
    threadContainer.appendChild(clone);

    const cancelButton = threadContainer.querySelector("#cancel");
    const postButton = threadContainer.querySelector("#post");

    cancelButton.addEventListener("click", () => {
        clearThreadContainer();
    });

    postButton.addEventListener("click", () => {
        const threadTitle = threadContainer.querySelector("#newTitle").value;
        const radios = threadContainer.querySelectorAll('input[name="newVisibility"]');
        const threadContent = threadContainer.querySelector("#newContent").value;

        let threadVisibility;
        radios.forEach(radio => {
            if (radio.checked) {
                threadVisibility = radio.value === "true";
            }
        });

        if (threadTitle) {
            postButton.disabled = true;
            newThread(threadTitle, threadVisibility, threadContent)
                .then(threadId => {
                    return getThread(threadId);
                })
                .then(threadDetails => {
                    return getProfile(threadDetails.creatorId)
                        .then(authorDetails => {
                            setupThreadDetail(threadDetails, authorDetails);
                        });
                })
                .catch(error => {
                    console.error(error);
                    showErrorMessage(error, "newThreadError");
                })
                .finally(() => {
                    postButton.disabled = false;
                });
        } else {
            showErrorMessage("Thread's title can't be empty!", "newThreadError");
        }
    });
}



function setupThreadDetail(thread, author) {
    clearThreadContainer();
    var template = document.getElementById('showThread');
    var clone = template.content.cloneNode(true);

    // Insert thread's detail
    clone.querySelector('#threadTitle').textContent = thread.title;
    clone.querySelector('#threadId').textContent = `#${thread.id}`;
    clone.querySelector('#authorAvatar').src = author.image;
    clone.querySelector('#threadAuthor').textContent = author.name;
    clone.querySelector('#threadTime').textContent = formatDate(thread.createdAt);
    clone.querySelector('#threadContent').textContent = thread.content;

    //event listener for thread's interaction

    const threadContainer = document.getElementById("threadContainer");
    threadContainer.appendChild(clone);
}

export function getThread(id) {
    console.log(`Getting thread ${id}`)
    return get(API + "/thread", {id: id}, localStorage.getItem('token'))
        .then(data => {
            if (data) {
                return data;
            } else {
                throw new Error(data.error);
            }
        })
        .catch(error => {
            console.error('Error fetching thread:', error);
            return null;
        });
}

export function populateThreadList(id) {
    getThread(id)
        .then(thread => {
            if (!thread) {
                return Promise.reject('Failed to retrieve thread');
            }
            return getProfile(thread.creatorId).then(author => {
                if (!author) {
                    return Promise.reject(thread.error);
                }
                createThreadListItem(thread, author);
            });
        })
        .catch(error => {
            console.error('Error displaying thread:', error);
        });
}

function createThreadListItem(thread, author) {
    const template = document.getElementById("threadListItemTemplate");
    const clone = template.content.cloneNode(true);

    clone.querySelector(".threadItem").id = thread.id;
    clone.querySelector(".threadTitle").textContent = thread.title;
    clone.querySelector(".threadAuthor").textContent = `Posted by ${author.name}`;
    clone.querySelector(".threadContent").textContent = thread.content;

    const threadListContainer = document.getElementById("threadList");
    threadListContainer.appendChild(clone);
}
function getThreadList(start) {
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

export function clearThreadContainer() {
    const threadContainer = document.getElementById("threadContainer");
    threadContainer.replaceChildren();
}