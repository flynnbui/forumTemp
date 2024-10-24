import { login, logout, register } from './Services/authService.js'
import { setupNewThread, getThreadList } from './Services/threadService.js';
import { setupProfileDetail } from './Services/userService.js';
import { USER_KEY } from './config.js';
import { showPage, showErrorMessage } from './helpers.js';
console.log("Let's go!");

let start = 0;
let reachedEnd = false;

function isSession() {
    getThreadList(start)
        .then(length => {
            start += length;
            showPage("forumPage");
        })
        .catch(error => {
            if (error.message === "No token provided!" || error.message === "Forbidden") {
                showPage("loginPage");
            }
        });
}
function setupLoginPage() {
    const loginForm = document.getElementById("loginForm");
    // Toggle between login and register pages
    document.querySelector("a[href='#register']").addEventListener("click", () => {
        showPage('registerPage');
    });
    // Handle login form submission
    loginForm.addEventListener('submit', (e) => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        login(email, password)
            .then(() => start += getThreadList())
            .catch(error => {
                console.error('Error logging in:', error);
                showErrorMessage(`${error.message}`, "loginError");
            });
        e.preventDefault();
    });
}
function setupRegisterPage() {
    const registerForm = document.getElementById("registerForm");

    // Toggle between login and register pages
    document.querySelector("a[href='#login']").addEventListener("click", (event) => {
        event.preventDefault();
        showPage('loginPage');
    });
    // Handle register form submission
    registerForm.addEventListener('submit', (e) => {
        const email = document.getElementById('registerEmail').value;
        const name = document.getElementById('registerName').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        register(email, name, password, confirmPassword)
            .then(() => start += getThreadList())
            .catch(error => {
                console.error('Error signing up:', error);
                showErrorMessage(`${error.message}`, "registerError");
            })
        e.preventDefault();
    })
}
function setupForumPage() {
    //Logout button
    const logoutButton = document.getElementById("logout");
    logoutButton.addEventListener('click', () => {
        logout()
    });

    //Add button
    document.querySelectorAll(".add").forEach(button => {
        button.addEventListener('click', () => {
            setupNewThread();
        });
    });

    //Profile button
    const profileButton = document.getElementById("profile");
    profileButton.addEventListener('click', () => {
        setupProfileDetail(localStorage.getItem(USER_KEY));
    })

    document.getElementById("threadList").addEventListener("scroll", (e) => {
        const element = e.target;
        const totalScrolled = element.scrollTop + element.clientHeight;
        if (totalScrolled >= element.scrollHeight && !reachedEnd) {
            getThreadList(start)
                .then(length => {
                    if (length === 0) {
                        reachedEnd = true;
                    } else {
                        start += length;
                    }
                });
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    setupLoginPage();
    setupRegisterPage();
    setupForumPage();
    isSession();
});
