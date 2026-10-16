// index.js
const express = require('express')
const app = express()
const port = 3000

app.use(express.json())

// Importação dos novos pacotes conforme o novo modelo
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const cors = require('cors')

// Inicializa configurações do dotenv e ativa o CORS
dotenv.config()
app.use(cors())

// Conexão com o banco de dados
const db = require('./conexao')
const pool = db.pool 

// --- ROTAS DE CLIENTES ---

// Cadastrar Cliente (Agora criptografa a senha e retorna o insertId)
app.post("/clientes", async (req, res) => {
    const cliente = req.body
    
    if (!cliente || Object.keys(cliente).length === 0) {
        return res.status(400).json({ msg: "Body não preenchido" })
    }
    const { nome, cpf, email, celular, senha } = cliente
    if (!nome || !cpf || !email || !celular || !senha) {
        return res.status(400).json({ msg: "Todos os campos (nome, cpf, email, celular, senha) são obrigatórios" })
    }

    try {
        // Criptografia da senha igual ao novo modelo
        const senhaCript = bcrypt.hashSync(senha, 10)
        
        const query = 'INSERT INTO Cliente (nome, cpf, email, celular, senha) VALUES (?, ?, ?, ?, ?)'
        const [resultado] = await pool.query(query, [nome, cpf, email, celular, senhaCript])
        
        res.status(201).json({
            msg: "Cliente cadastrado, ID = " + resultado.insertId
        })
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ msg: "CPF ou Email já cadastrado!" })
        }
        res.status(500).json({ erro: error.message })
    }    
})

// Buscar Todos os Clientes
app.get("/clientes", async (req, res) => {
    try {
        const [linhas] = await pool.query('SELECT id, nome, cpf, email, celular FROM Cliente')
        res.status(200).json(linhas)
    } catch (error) {
        res.status(500).json({ erro: error.message })
    }
})

// Buscar Cliente por CPF
app.get("/clientes/:cpf", async (req, res) => {
    const cpfLimpo = req.params.cpf.replace(/[^\d]/g, '')
    try {
        const query = "SELECT id, nome, cpf, email, celular FROM Cliente WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?"
        const [resultado] = await pool.query(query, [cpfLimpo])

        if (resultado.length === 0) {
            return res.status(404).json({ msg: "Cliente não encontrado no banco de dados" })
        }
        res.status(200).json(resultado[0])
    } catch (error) {
        res.status(500).json({ erro: error.message })
    }
})

// Atualizar Cliente por CPF
app.put("/clientes/:cpf", async (req, res) => {
    const cpfLimpo = req.params.cpf.replace(/[^\d]/g, '')
    const { nome, email, celular, senha } = req.body

    try {
        const queryBuscar = "SELECT nome, email, celular, senha FROM Cliente WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?"
        const [clientes] = await pool.query(queryBuscar, [cpfLimpo])

        if (clientes.length === 0) {
            return res.status(404).json({ msg: "Cliente não existe no banco de dados" })
        }
        
        const clienteAtual = clientes[0]
        
        // Se uma nova senha for enviada, ela também deve ser criptografada aqui
        let senhaFinal = clienteAtual.senha
        if (senha) {
            senhaFinal = bcrypt.hashSync(senha, 10)
        }

        const dadosNovos = {
            nome: nome || clienteAtual.nome,
            email: email || clienteAtual.email,
            celular: celular || clienteAtual.celular,
            senha: senhaFinal
        }
        
        const queryAtualizar = "UPDATE Cliente SET nome = ?, email = ?, celular = ?, senha = ? WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?"
        await pool.query(queryAtualizar, [dadosNovos.nome, dadosNovos.email, dadosNovos.celular, dadosNovos.senha, cpfLimpo])
        res.status(200).json({ msg: "Dados do cliente alterados com sucesso!" })
    } catch (error) {
        res.status(500).json({ erro: error.message })   
    }
})

// Deletar Cliente por CPF
app.delete("/clientes/:cpf", async (req, res) => {
    const cpfLimpo = req.params.cpf.replace(/[^\d]/g, '') 

    try {
        const queryDeletar = "DELETE FROM Cliente WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?"
        const [resultado] = await pool.query(queryDeletar, [cpfLimpo])

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ msg: "Cliente não existe no banco de dados" })
        }
        res.status(200).json({ msg: "Cliente deletado com sucesso do banco de dados!" })
    } catch (error) {
        res.status(500).json({ erro: error.message })   
    }
})

// --- OUTRAS ROTAS ---

// Buscar Ponys
app.get("/ponys", async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.nome, p.cor_corpo, p.cor_crina, p.preco, p.estoque, c.nome AS categoria 
            FROM Pony p 
            INNER JOIN Categoria c ON p.id_categoria = c.id
        `
        const [ponys] = await pool.query(query)
        res.status(200).json(ponys)
    } catch (error) {
        res.status(500).json({ erro: error.message })
    }
})

// Rota de Login (Atualizada com verificação correta e geração de JWT)
app.post("/login", async (req, res) => {
    try {
        const user = req.body
        const resultado = await pool.query(
            "SELECT id, nome, email, senha FROM Cliente WHERE email = ?", 
            [user.email]
        )
        const dados_bd = resultado[0][0]

        if (!dados_bd) {
            return res.status(401).json({ msg: "Email não cadastrado!" })
        }

        const senha_valida = await bcrypt.compare(user.senha, dados_bd.senha)

        if (!senha_valida) {
            return res.status(401).json({ msg: "Credenciais inválidas!" })
        }

        // Criação do Payload e Assinatura do Token JWT
        const payload = {
            id: dados_bd.id,
            email: dados_bd.email
        } 
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1m' })
        
        return res.status(200).json({ nome: dados_bd.nome, token: token })

    } catch (error) {
        res.status(500).json({ erro: error.message })
    }
})

app.listen(port, () => {
    console.log("API rodando na porta " + port)
})
