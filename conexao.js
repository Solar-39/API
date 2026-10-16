// conexao.js
const mysql = require("mysql2/promise")

const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306, // 🌟 CORRIGIDO: Porta padrão do MySQL (era 3000)
    user: 'root',
    password: 'escola', 
    database: 'backend2triDSB' 
})

module.exports = Object.freeze({
    pool: pool
})
