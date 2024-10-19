import { deleteRequest, get, post, put } from "./helpers.js"
import { API, TOKEN_KEY, USER_KEY } from "./config.js"
import { getProfile } from "./userService.js";
import { getThread } from "./threadService.js";
import { showErrorMessage } from "./helpers.js";

export function setupComment(thread) {
    populateComment(thread);
    postComment(thread);
}

function getComment(threadId) {
    let mainComment = [];
    let subComment = [];
    return get(API + "/comments", { threadId: threadId }, localStorage.getItem(TOKEN_KEY))
        .then(commentList => {
            commentList.forEach(comment => {
                if (!comment.parentCommentId) {
                    mainComment.push(comment);
                } else {
                    subComment.push(comment);
                }
            });
            return { mainComment, subComment };
        })
        .then(Response => {
            let sortedMain = sortCommentList(Response.mainComment);
            let sortedSub = sortCommentList(Response.subComment);
            return { sortedMain, sortedSub };
        });
}

export function postComment(thread, parentCommentId = null) {
    const discussionForm = document.querySelector("#discussionForm");
    const postButton = discussionForm.querySelector(".postButton");

    postButton.addEventListener("click", (e) => {
        const comment = discussionForm.querySelector("#comment").value;
        e.preventDefault();
        post(API + "/comment", { content: comment, threadId: thread.id, parentCommentId: parentCommentId }, localStorage.getItem(TOKEN_KEY))
            .then(() => {
                clearCommentBox();
                populateComment(thread.id)
            })
            .catch(error => {
                console.error("Failed to post new comment", error);
            });
    });
}

function editComment(id, comment) {
    return put(API + "comment", { id, comment }, localStorage.getItem(TOKEN_KEY));
}

function deleteComment(id) {
    return deleteRequest(API + "comment", id, localStorage.getItem(TOKEN_KEY));
}

function setupLikeComment(thread, comment) {
    let likes = [];
    if (comment.likes && comment.likes.length > 0) {
        try {
            const parsedLikes = JSON.parse(comment.likes);
            likes = Array.isArray(parsedLikes) ? parsedLikes : [parsedLikes];
        } catch (error) {
            console.error("Error parsing likes:", error);
            likes = [];
        }
    }
    let userKey = Number(localStorage.getItem(USER_KEY));
    let liked = likes.includes(userKey);
    const commentItem = document.getElementById(comment.id);

    const likeButton = commentItem.querySelector(".likeButton");
    likeButton.textContent = liked ? "Unlike" : "Like";

    likeButton.addEventListener("click", (e) => {
        e.preventDefault();
        if (thread.lock) {
            showErrorMessage(`This thread ${thread.id} is locked`, "showThreadError");
            return;
        }

        const newLikedState = !liked;
        liked = newLikedState;
        return put(API + "/comment/like", { id: comment.id, turnon: newLikedState }, localStorage.getItem(TOKEN_KEY))
            .then(response => {
                if (!response.error) {
                    console.log(`Comment ${comment.id} ${liked ? "liked" : "unliked"} successfully!`);
                    clearCommentBox();
                    populateComment(thread);
                } else {
                    throw new Error(response.error);
                }
            })
            .catch((error) => {
                console.error("Error handling like/unlike:", error);
                liked = !liked;
            });
    })
}

function setupEditComment(thread, comment) {
    const commentItem = document.getElementById(comment.id);
    const editButton = commentItem.querySelector(".editButton");
    const editModal = document.getElementById("editCommentModal");
    const commentContent = document.getElementById("commentContent");
    const editCommentForm = document.getElementById("editCommentForm");

    editButton.addEventListener("click", () => {
        commentContent.value = comment.content;

        editModal.classList.remove("hidden");

        editCommentForm.onsubmit = function (e) {
            e.preventDefault();
            const updatedContent = commentContent.value;

            if (thread.lock) {
                showErrorMessage(`This thread ${thread.id} is locked`, "showThreadError");
                return;
            }
            put(API + "/comment/edit", { id: comment.id, content: updatedContent }, localStorage.getItem(TOKEN_KEY))
                .then(response => {
                    if (!response.error) {
                        console.log(`Comment ${comment.id} updated successfully!`);
                        clearCommentBox();
                        populateComment(thread);
                        // Close the modal
                        editModal.classList.add("hidden");
                    } else {
                        throw new Error(response.error);
                    }
                })
                .catch((error) => {
                    console.error("Error updating comment:", error);
                });
        };
    });
}


function sortCommentList(commentList) {
    // Sort by createdAt (newest to oldest)
    return commentList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getTimeSinceCommented(createdAt, likes) {
    const timeUnits = [
        { unit: 'week', seconds: 604800 },
        { unit: 'day', seconds: 86400 },
        { unit: 'hour', seconds: 3600 },
        { unit: 'minute', seconds: 60 }
    ];

    const now = new Date();
    const commentTime = new Date(createdAt);
    const diffInSeconds = Math.floor((now - commentTime) / 1000);

    for (const { unit, seconds } of timeUnits) {
        if (diffInSeconds >= seconds) {
            const count = Math.floor(diffInSeconds / seconds);
            const timeString = `${count} ${unit}${count > 1 ? 's' : ''} ago`;
            return `${timeString} | ${likes} like${likes !== 1 ? 's' : ''}`;
        }
    }

    return `Just now | ${likes} like${likes !== 1 ? 's' : ''}`;
}

function createMainComment(thread, comment, author) {
    const template = document.getElementById("mainComment");
    const clone = template.content.cloneNode(true);

    const mainComment = clone.querySelector(".mainComment");
    mainComment.id = comment.id;

    mainComment.querySelector(".commentAuthor").textContent = author.name;
    mainComment.querySelector(".commentTime").textContent = getTimeSinceCommented(comment.createdAt, comment.likes.length);
    mainComment.querySelector(".commentContent").textContent = comment.content;

    // Append the cloned main comment to the comment box
    const commentBox = document.querySelector("#commentBox");

    commentBox.appendChild(clone);
    setupLikeComment(thread, comment);
    setupEditComment(thread, comment)
}

function createSubComment(thread, comment, author) {
    const template = document.getElementById("subComment");
    const clone = template.content.cloneNode(true);

    const subComment = clone.querySelector(".subComment");
    subComment.id = comment.id;

    subComment.querySelector(".subCommentAuthor").textContent = author.name;
    subComment.querySelector(".subCommentTime").textContent = getTimeSinceCommented(comment.createdAt, comment.likes.length);
    subComment.querySelector(".subCommentContent").textContent = comment.content;

    const mainComment = document.getElementById(comment.parentCommentId);
    if (!mainComment) {
        console.error("Main comment not found for sub-comment", comment.id);
        return;
    }

    const subCommentBox = mainComment.querySelector(".subCommentBox");
    if (!subCommentBox) {
        console.error("Sub-comment box not found in main comment", mainComment.id);
        return;
    }

    subCommentBox.appendChild(clone);
    setupLikeComment(thread, comment);
    setupEditComment(thread, comment)
}

function clearCommentBox() {
    const commentBox = document.querySelector("#commentBox");
    commentBox.replaceChildren();
}


function populateComment(thread) {
    getComment(thread.id)
        .then(Response => {
            const mainCommentPromises = Response.sortedMain.map(comment => {
                return getProfile(comment.creatorId).then(author => {
                    createMainComment(thread, comment, author);
                });
            });
            return Promise.all(mainCommentPromises).then(() => Response);
        })
        .then(Response => {
            const subCommentPromises = Response.sortedSub.map(comment => {
                return getProfile(comment.creatorId).then(author => {
                    createSubComment(thread, comment, author);
                });
            });
            return Promise.all(subCommentPromises);
        })
        .catch(error => {
            console.error("Failed to populate comments", error);
        });
}

