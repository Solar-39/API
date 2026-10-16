// index.js
const express = require('express')
const app = express()
const port = 3000

app.use(express.json())

// Pacotes
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
const cors = require('cors')

// Configurações
dotenv.config()
app.use(cors())

// Conexão com o banco de dados
const db = require('./conexao')
const pool = db.pool

// =====================================================
// FUNÇÃO DE AUTENTICAÇÃO JWT
// =====================================================

function autenticar(req, res, next) {
    const authHeader = req.headers['authorization']

    // Espera:
    // Authorization: Bearer TOKEN
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) {
        return res.status(401).json({
            erro: "Token não enviado, usar Authorization Bearer <token>"
        })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
        if (err) {
            return res.status(403).json({
                erro: "Token inválido"
            })
        }

        // Guarda os dados do token na requisição
        req.usuario = usuario

        next()
    })
}

// =====================================================
// ROTAS DE CLIENTES
// =====================================================

// Cadastrar Cliente
app.post("/clientes", async (req, res) => {
    const cliente = req.body

    if (!cliente || Object.keys(cliente).length === 0) {
        return res.status(400).json({
            msg: "Body não preenchido"
        })
    }

    const {
        nome,
        cpf,
        email,
        celular,
        senha
    } = cliente

    if (!nome || !cpf || !email || !celular || !senha) {
        return res.status(400).json({
            msg: "Todos os campos (nome, cpf, email, celular, senha) são obrigatórios"
        })
    }

    try {
        // Criptografa a senha
        const senhaCript = bcrypt.hashSync(senha, 10)

        const query = `
            INSERT INTO Cliente
            (nome, cpf, email, celular, senha)
            VALUES (?, ?, ?, ?, ?)
        `

        const [resultado] = await pool.query(query, [
            nome,
            cpf,
            email,
            celular,
            senhaCript
        ])

        res.status(201).json({
            msg: "Cliente cadastrado, ID = " + resultado.insertId
        })

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                msg: "CPF ou Email já cadastrado!"
            })
        }

        res.status(500).json({
            erro: error.message
        })
    }
})

// =====================================================
// BUSCAR TODOS OS CLIENTES
// =====================================================

app.get("/clientes", async (req, res) => {
    try {
        const [linhas] = await pool.query(`
            SELECT id, nome, cpf, email, celular
            FROM Cliente
        `)

        res.status(200).json(linhas)

    } catch (error) {
        res.status(500).json({
            erro: error.message
        })
    }
})

// =====================================================
// BUSCAR CLIENTE POR CPF
// =====================================================

app.get("/clientes/:cpf", async (req, res) => {
    const cpfLimpo = req.params.cpf.replace(/[^\d]/g, '')

    try {
        const query = `
            SELECT id, nome, cpf, email, celular
            FROM Cliente
            WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?
        `

        const [resultado] = await pool.query(query, [cpfLimpo])

        if (resultado.length === 0) {
            return res.status(404).json({
                msg: "Cliente não encontrado no banco de dados"
            })
        }

        res.status(200).json(resultado[0])

    } catch (error) {
        res.status(500).json({
            erro: error.message
        })
    }
})

// =====================================================
// ATUALIZAR CLIENTE POR CPF
// =====================================================

app.put("/clientes/:cpf", async (req, res) => {
    const cpfLimpo = req.params.cpf.replace(/[^\d]/g, '')

    const {
        nome,
        email,
        celular,
        senha
    } = req.body

    try {
        const queryBuscar = `
            SELECT nome, email, celular, senha
            FROM Cliente
            WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?
        `

        const [clientes] = await pool.query(
            queryBuscar,
            [cpfLimpo]
        )

        if (clientes.length === 0) {
            return res.status(404).json({
                msg: "Cliente não existe no banco de dados"
            })
        }

        const clienteAtual = clientes[0]

        // Mantém a senha antiga
        let senhaFinal = clienteAtual.senha

        // Se mandou nova senha, criptografa
        if (senha) {
            senhaFinal = bcrypt.hashSync(senha, 10)
        }

        const dadosNovos = {
            nome: nome || clienteAtual.nome,
            email: email || clienteAtual.email,
            celular: celular || clienteAtual.celular,
            senha: senhaFinal
        }

        const queryAtualizar = `
            UPDATE Cliente
            SET nome = ?, email = ?, celular = ?, senha = ?
            WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?
        `

        await pool.query(queryAtualizar, [
            dadosNovos.nome,
            dadosNovos.email,
            dadosNovos.celular,
            dadosNovos.senha,
            cpfLimpo
        ])

        res.status(200).json({
            msg: "Dados do cliente alterados com sucesso!"
        })

    } catch (error) {
        res.status(500).json({
            erro: error.message
        })
    }
})

// =====================================================
// DELETAR CLIENTE POR CPF
// =====================================================

app.delete("/clientes/:cpf", async (req, res) => {
    const cpfLimpo = req.params.cpf.replace(/[^\d]/g, '')

    try {
        const queryDeletar = `
            DELETE FROM Cliente
            WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?
        `

        const [resultado] = await pool.query(
            queryDeletar,
            [cpfLimpo]
        )

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                msg: "Cliente não existe no banco de dados"
            })
        }

        res.status(200).json({
            msg: "Cliente deletado com sucesso do banco de dados!"
        })

    } catch (error) {
        res.status(500).json({
            erro: error.message
        })
    }
})

// =====================================================
// BUSCAR PONYS
// =====================================================

app.get("/ponys", async (req, res) => {
    try {
        const query = `
            SELECT
                p.id,
                p.nome,
                p.cor_corpo,
                p.cor_crina,
                p.preco,
                p.estoque,
                c.nome AS categoria
            FROM Pony p
            INNER JOIN Categoria c
                ON p.id_categoria = c.id
        `

        const [ponys] = await pool.query(query)

        res.status(200).json(ponys)

    } catch (error) {
        res.status(500).json({
            erro: error.message
        })
    }
})

// =====================================================
// LOGIN
// =====================================================

app.post("/login", async (req, res) => {
    try {
        const user = req.body

        const resultado = await pool.query(
            `
            SELECT id, nome, email, senha
            FROM Cliente
            WHERE email = ?
            `,
            [user.email]
        )

        const dados_bd = resultado[0][0]

        if (!dados_bd) {
            return res.status(401).json({
                msg: "Email não cadastrado!"
            })
        }

        const senha_valida = await bcrypt.compare(
            user.senha,
            dados_bd.senha
        )

        if (!senha_valida) {
            return res.status(401).json({
                msg: "Credenciais inválidas!"
            })
        }

        // Dados que serão colocados dentro do JWT
        const payload = {
            id: dados_bd.id,
            email: dados_bd.email
        }

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            {
                expiresIn: '2m'
            }
        )

        return res.status(200).json({
            nome: dados_bd.nome,
            token: token
        })

    } catch (error) {
        res.status(500).json({
            erro: error.message
        })
    }
})

// =====================================================
// PERFIL DO CLIENTE AUTENTICADO
// =====================================================

app.get("/cliente/perfil", autenticar, async (req, res) => {
    try {
        // O ID veio de dentro do JWT
        const id = req.usuario.id

        const result = await pool.query(
            "SELECT * FROM Cliente WHERE id = ?",
            [id]
        )

        const perfil = result[0][0]

        if (!perfil) {
            return res.status(404).json({
                msg: "Cliente não encontrado"
            })
        }

        // Nunca devolver a senha
        delete perfil.senha

        res.status(200).json(perfil)

    } catch (error) {
        res.status(500).json({
            erro: "Erro interno"
        })
    }
})

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(port, () => {
    console.log("API rodando na porta " + port)
})

