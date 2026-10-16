function atualizar_navbar() {
    const nome = localStorage.getItem("nome_cliente")
    const token = localStorage.getItem("token")

    const nav_login = document.getElementById("nav-login")
    const btn_user_info = document.getElementById("user-info")

    if(token && nome) {
        nav_login.style.display = "none"
        btn_user_info.style.display = "inline"
        btn_user_info.innerText= "Olá, " + nome.split(" ")[0]
    } else {
        nav_login.style.display = "inline"
        btn_user_info.style.display = "none"
    }
}

function logout() {
    localStorage.removeItem("nome_cliente")
    localStorage.removeItem("token")
    window.location.href = "login.html"
}

window.addEventListener("DOMContentLoaded", atualizar_navbar)