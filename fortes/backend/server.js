// Importações de módulos
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// Inicializa o aplicativo Express
const app = express();
const port = 3000;

// =======================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS POSTGRESQL
// ATENÇÃO: Verifique se estas credenciais estão corretas para o seu PostgreSQL
// =======================================================================
const pool = new Pool({
    user: 'fortes',
    host: 'localhost',
    database: 'fortes',
    password: 'jorge6',
    port: 5432,
});

// Testar a conexão com o banco de dados ao iniciar o servidor
pool.connect((err, client, done) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados PostgreSQL:', err.message);
        process.exit(1);
    } else {
        console.log('Conectado ao banco de dados PostgreSQL.');
        done();
    }
});

// Configuração do CORS
app.use(cors({
    origin: 'http://127.0.0.1:5500' // Ajuste para o URL exato do seu frontend
}));
app.use(express.json());

// Função assíncrona para inicializar o banco de dados (criar tabelas e inserir dados de teste)
async function initializeDatabase() {
    try {
        // --- Criação da tabela usuario ---
        const createUsuarioTableSql = `
            CREATE TABLE IF NOT EXISTS usuario (
                id_usuario BIGSERIAL PRIMARY KEY,
                email VARCHAR(50) NOT NULL UNIQUE,
                senha VARCHAR(255) NOT NULL,
                tipo_usuario VARCHAR(20) NOT NULL,
                nome_usuario VARCHAR(100) NOT NULL,
                CONSTRAINT chk_tipo_usuario CHECK (tipo_usuario IN ('Produtor', 'Reciclador'))
            );
        `;
        await pool.query(createUsuarioTableSql);
        console.log('Tabela usuario verificada/criada.');

        // Insere usuários de teste se a tabela estiver vazia (com hash de senha)
        const { rows: userCount } = await pool.query("SELECT COUNT(*) AS count FROM usuario;");
        if (userCount[0].count === '0') {
            console.log('Inserindo usuários de teste...');
            const hashedPasswordProdutor = await bcrypt.hash('123456', 10);
            const hashedPasswordReciclador = await bcrypt.hash('123456', 10);
            await pool.query(`INSERT INTO usuario (email, senha, nome_usuario, tipo_usuario) VALUES ($1, $2, $3, $4);`,
                ['admin@fortes.com.br', hashedPasswordProdutor, 'Jorge Silva', 'Produtor']);
            await pool.query(`INSERT INTO usuario (email, senha, nome_usuario, tipo_usuario) VALUES ($1, $2, $3, $4);`,
                ['cooperativas@fortes.com.br', hashedPasswordReciclador, 'Jorgina Oliveira', 'Reciclador']);
            console.log('Usuários de teste inseridos.');
        } else {
            console.log('Usuários de teste já existem.');
        }

        // --- Criação da tabela ponto_coleta ---
        // Alterado para apenas BIGINT PRIMARY KEY, permitindo inserção de IDs específicos.
        // Se usar BIGSERIAL e inserir IDs, precisará de setval()
        const createPontoColetaTableSql = `
            CREATE TABLE IF NOT EXISTS ponto_coleta (
                id_ponto BIGINT PRIMARY KEY,
                nome_ponto VARCHAR(100) NOT NULL,
                tipo_ponto VARCHAR(255), -- Aumentado para acomodar múltiplos tipos (ex: 'Plástico, Papel')
                endereco VARCHAR(200)
            );
        `;
        await pool.query(createPontoColetaTableSql);
        console.log('Tabela ponto_coleta verificada/criada.');

        // Insere os pontos de coleta de teste com os novos dados
        // Primeiro, verifica se existem pontos de coleta com os IDs específicos para evitar duplicidade
        const { rows: pontoCount } = await pool.query("SELECT COUNT(*) AS count FROM ponto_coleta WHERE id_ponto IN (101, 102, 103, 104, 105);");
        if (pontoCount[0].count === '0') {
            console.log('Inserindo pontos de coleta de teste...');
            await pool.query(`
                INSERT INTO ponto_coleta (id_ponto, nome_ponto, tipo_ponto, endereco) VALUES
                (101, 'Ecoponto Praia da Costa', 'Plástico, Papel', 'Av. Antônio Gil Veloso, s/n - Praia da Costa, Vila Velha - ES'),
                (102, 'Ponto Comunitário Cobilândia', 'Orgânico', 'Rua Santa Terezinha, 50 - Cobilândia, Vila Velha - ES'),
                (103, 'Coleta Eletrônicos Glória', 'Eletrônico, Borracha', 'Rua da Indústria, 300 - Glória, Vila Velha - ES'),
                (104, 'Ecoponto Coqueiral', 'Vidro, Metal', 'Av. Santa Leopoldina, 800 - Coqueiral de Itaparica, Vila Velha - ES'),
                (105, 'Coleta Baterias Centro', 'Bateria', 'Av. Jerônimo Monteiro, 900 - Centro, Vila Velha - ES');
            `);
            console.log('Pontos de coleta de teste inseridos.');
        } else {
            console.log('Pontos de coleta de teste já existem com os IDs específicos.');
        }

        // Se você tiver o id_ponto como BIGSERIAL e quiser garantir que a sequência está correta
        // após inserções manuais com IDs específicos, execute isso.
        // Para os IDs que você forneceu (101, 102, etc.), se a tabela for BIGSERIAL
        // o ideal é deixar o banco gerar os IDs ou gerenciar a sequência.
        // Como você forneceu IDs explícitos na tabela, a deixei como BIGINT PRIMARY KEY.
        // Se decidir voltar para BIGSERIAL, remova os IDs da instrução INSERT e rode:
        // SELECT setval('ponto_coleta_id_ponto_seq', COALESCE(MAX(id_ponto), 0) + 1, false) FROM ponto_coleta;

        // --- Criação da tabela lixo ---
        const createLixoTableSql = `
            CREATE TABLE IF NOT EXISTS lixo (
                id_lixo BIGSERIAL PRIMARY KEY,
                nome_lixo VARCHAR(50) NOT NULL,
                tipo_lixo VARCHAR(25) NOT NULL,
                status VARCHAR(25) NOT NULL,
                data_postagem TIMESTAMP NOT NULL,
                data_coleta TIMESTAMP,
                id_produtor_fk BIGINT NOT NULL,
                id_reciclador_fk BIGINT,
                id_ponto_coleta_fk BIGINT NOT NULL,
                CONSTRAINT fk_lixo_produtor FOREIGN KEY(id_produtor_fk) REFERENCES usuario (id_usuario),
                CONSTRAINT fk_lixo_reciclador FOREIGN KEY(id_reciclador_fk) REFERENCES usuario (id_usuario),
                CONSTRAINT fk_lixo_ponto_coleta FOREIGN KEY(id_ponto_coleta_fk) REFERENCES ponto_coleta (id_ponto),
                CONSTRAINT chk_status_lixo CHECK (status IN ('Pendente', 'Reciclador à caminho', 'Coletado', 'Cancelado'))
            );
        `;
        await pool.query(createLixoTableSql);
        console.log('Tabela lixo verificada/creada.');

        // --- Criação da tabela comentario ---
        const createComentarioTableSql = `
            CREATE TABLE IF NOT EXISTS comentario (
                id_comentario BIGSERIAL PRIMARY KEY,
                id_lixo_fk BIGINT NOT NULL,
                id_usuario_fk BIGINT NOT NULL,
                texto VARCHAR(500) NOT NULL,
                data_comentario TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_comentario_lixo FOREIGN KEY(id_lixo_fk) REFERENCES lixo (id_lixo) ON DELETE CASCADE,
                CONSTRAINT fk_comentario_usuario FOREIGN KEY(id_usuario_fk) REFERENCES usuario (id_usuario)
            );
        `;
        await pool.query(createComentarioTableSql);
        console.log('Tabela comentario verificada/creada.');

    } catch (err) {
        console.error('Erro na inicialização do banco de dados:', err.message);
    }
}

// Chama a função de inicialização do banco de dados
initializeDatabase();

// =======================================================================
// ROTAS DE AUTENTICAÇÃO
// =======================================================================
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }
    try {
        const sql = `SELECT * FROM usuario WHERE email = $1;`;
        const { rows } = await pool.query(sql, [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
        const isPasswordValid = await bcrypt.compare(senha, user.senha);

        if (isPasswordValid) {
            return res.status(200).json({
                message: 'Login bem-sucedido!',
                user: {
                    id_usuario: user.id_usuario,
                    email: user.email,
                    nome_usuario: user.nome_usuario,
                    tipo_usuario: user.tipo_usuario
                }
            });
        } else {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
    } catch (err) {
        console.error('Erro na rota de login:', err.message);
        return res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// =======================================================================
// ROTAS PARA PONTOS DE COLETA
// =======================================================================
// GET /pontos-coleta - Lista pontos de coleta, com filtro opcional por tipo_lixo
app.get('/pontos-coleta', async (req, res) => {
    const { tipo_lixo } = req.query; // Pega o tipo_lixo da query string (ex: /pontos-coleta?tipo_lixo=Plastico)
    try {
        let sql = 'SELECT * FROM ponto_coleta';
        const params = [];

        if (tipo_lixo) {
            // Usa ILIKE para buscar tipos de lixo que CONTENHAM o tipo solicitado
            // A regex \y é para word boundary, garantindo que "Metal" não encontre "Metálico" ou similar,
            // e também funciona para tipos como "Plástico, Papel"
            sql += ` WHERE tipo_ponto ILIKE '%' || $1 || '%'`; // Busca por substring em tipo_ponto
            params.push(tipo_lixo);
        }
        sql += ' ORDER BY nome_ponto;';

        const { rows } = await pool.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar pontos de coleta:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar pontos de coleta.' });
    }
});

// =======================================================================
// ROTAS PARA LIXO (PRODUTOR)
// =======================================================================
// POST /lixo - Adicionar um novo item de lixo
app.post('/lixo', async (req, res) => {
    const { nome_lixo, tipo_lixo, id_produtor_fk, id_ponto_coleta_fk } = req.body;

    if (!nome_lixo || !tipo_lixo || !id_produtor_fk || !id_ponto_coleta_fk) {
        return res.status(400).json({ message: 'Campos nome_lixo, tipo_lixo, id_produtor_fk e id_ponto_coleta_fk são obrigatórios.' });
    }

    try {
        const status = 'Pendente';
        const data_postagem = new Date(); // Timestamp atual

        const sql = `
            INSERT INTO lixo (nome_lixo, tipo_lixo, status, data_postagem, id_produtor_fk, id_ponto_coleta_fk)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;
        const { rows } = await pool.query(sql, [nome_lixo, tipo_lixo, status, data_postagem, id_produtor_fk, id_ponto_coleta_fk]);
        res.status(201).json({ message: 'Lixo postado com sucesso!', lixo: rows[0] });
    } catch (err) {
        console.error('Erro ao adicionar lixo:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao adicionar lixo.' });
    }
});

// GET /lixo/produtor/:id_produtor - Listar lixos postados por um produtor com filtros opcionais
app.get('/lixo/produtor/:id_produtor', async (req, res) => {
    const { id_produtor } = req.params;
    const { tipo_lixo, nome_ponto } = req.query; // Novos parâmetros de filtro
    let sql = `
        SELECT
            l.*,
            pc.nome_ponto,
            pc.endereco,
            r.nome_usuario AS nome_reciclador
        FROM
            lixo l
        JOIN
            ponto_coleta pc ON l.id_ponto_coleta_fk = pc.id_ponto
        LEFT JOIN
            usuario r ON l.id_reciclador_fk = r.id_usuario
        WHERE
            l.id_produtor_fk = $1
    `;
    const params = [id_produtor];
    let paramIndex = 2;

    if (tipo_lixo) {
        sql += ` AND l.tipo_lixo ILIKE $${paramIndex++}`;
        params.push(`%${tipo_lixo}%`);
    }
    if (nome_ponto) {
        sql += ` AND pc.nome_ponto ILIKE $${paramIndex++}`;
        params.push(`%${nome_ponto}%`);
    }

    sql += ` ORDER BY l.data_postagem DESC;`;

    try {
        const { rows } = await pool.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar lixos do produtor:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar lixos do produtor.' });
    }
});

// PUT /lixo/:id_lixo/cancelar-produtor - Produtor cancela um lixo (se não estiver coletado)
app.put('/lixo/:id_lixo/cancelar-produtor', async (req, res) => {
    const { id_lixo } = req.params;
    const { id_produtor_fk } = req.body; // Para garantir que apenas o produtor dono pode cancelar

    if (!id_produtor_fk) {
        return res.status(400).json({ message: 'ID do produtor é obrigatório para cancelar.' });
    }

    try {
        const { rows: lixoExistente } = await pool.query('SELECT status, id_produtor_fk FROM lixo WHERE id_lixo = $1;', [id_lixo]);

        if (lixoExistente.length === 0) {
            return res.status(404).json({ message: 'Lixo não encontrado.' });
        }

        if (lixoExistente[0].id_produtor_fk.toString() !== id_produtor_fk.toString()) {
            return res.status(403).json({ message: 'Você não tem permissão para cancelar este lixo.' });
        }

        if (lixoExistente[0].status === 'Coletado') {
            return res.status(400).json({ message: 'Não é possível cancelar um lixo já coletado.' });
        }

        const sql = `UPDATE lixo SET status = 'Cancelado', id_reciclador_fk = NULL, data_coleta = NULL WHERE id_lixo = $1 RETURNING *;`;
        const { rows } = await pool.query(sql, [id_lixo]);
        res.status(200).json({ message: 'Lixo cancelado com sucesso pelo produtor.', lixo: rows[0] });
    } catch (err) {
        console.error('Erro ao cancelar lixo pelo produtor:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao cancelar lixo.' });
    }
});

// =======================================================================
// ROTAS PARA LIXO (RECICLADOR)
// =======================================================================
// GET /lixo/disponivel - Listar lixos disponíveis para coleta (status 'Pendente') com filtros opcionais
app.get('/lixo/disponivel', async (req, res) => {
    const { tipo_lixo, nome_ponto } = req.query; // Novos parâmetros de filtro
    let sql = `
        SELECT
            l.id_lixo,
            l.nome_lixo,
            l.tipo_lixo,
            l.data_postagem,
            p.nome_usuario AS nome_produtor,
            pc.nome_ponto,
            pc.endereco
        FROM
            lixo l
        JOIN
            usuario p ON l.id_produtor_fk = p.id_usuario
        JOIN
            ponto_coleta pc ON l.id_ponto_coleta_fk = pc.id_ponto
        WHERE
            l.status = 'Pendente'
    `;
    const params = [];
    let paramIndex = 1;

    if (tipo_lixo) {
        sql += ` AND l.tipo_lixo ILIKE $${paramIndex++}`;
        params.push(`%${tipo_lixo}%`);
    }
    if (nome_ponto) {
        sql += ` AND pc.nome_ponto ILIKE $${paramIndex++}`;
        params.push(`%${nome_ponto}%`);
    }

    sql += ` ORDER BY l.data_postagem ASC;`;

    try {
        const { rows } = await pool.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar lixos disponíveis:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar lixos disponíveis.' });
    }
});

// PUT /lixo/:id_lixo/coletar - Reciclador marca um lixo para coleta (status 'Reciclador à caminho')
app.put('/lixo/:id_lixo/coletar', async (req, res) => {
    const { id_lixo } = req.params;
    const { id_reciclador_fk } = req.body;

    if (!id_reciclador_fk) {
        return res.status(400).json({ message: 'ID do reciclador é obrigatório para coletar.' });
    }

    try {
        const { rows: lixoExistente } = await pool.query('SELECT status, id_reciclador_fk FROM lixo WHERE id_lixo = $1;', [id_lixo]);

        if (lixoExistente.length === 0) {
            return res.status(404).json({ message: 'Lixo não encontrado.' });
        }
        if (lixoExistente[0].status !== 'Pendente') {
            return res.status(400).json({ message: 'Este lixo não está disponível para coleta (status: ' + lixoExistente[0].status + ').' });
        }
        if (lixoExistente[0].id_reciclador_fk) {
            return res.status(400).json({ message: 'Este lixo já está sendo coletado por outro reciclador.' });
        }

        const sql = `
            UPDATE lixo
            SET status = 'Reciclador à caminho', id_reciclador_fk = $1
            WHERE id_lixo = $2 RETURNING *;
        `;
        const { rows } = await pool.query(sql, [id_reciclador_fk, id_lixo]);
        res.status(200).json({ message: 'Lixo marcado para coleta com sucesso.', lixo: rows[0] });
    } catch (err) {
        console.error('Erro ao marcar lixo para coleta:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao marcar lixo para coleta.' });
    }
});

// GET /lixo/reciclador/:id_reciclador - Listar lixos que um reciclador está coletando ou coletou com filtros opcionais
app.get('/lixo/reciclador/:id_reciclador', async (req, res) => {
    const { id_reciclador } = req.params;
    const { tipo_lixo, nome_ponto } = req.query; // Novos parâmetros de filtro
    let sql = `
        SELECT
            l.*,
            p.nome_usuario AS nome_produtor,
            pc.nome_ponto,
            pc.endereco
        FROM
            lixo l
        JOIN
            usuario p ON l.id_produtor_fk = p.id_usuario
        JOIN
            ponto_coleta pc ON l.id_ponto_coleta_fk = pc.id_ponto
        WHERE
            l.id_reciclador_fk = $1 AND l.status IN ('Reciclador à caminho', 'Coletado')
    `;
    const params = [id_reciclador];
    let paramIndex = 2;

    if (tipo_lixo) {
        sql += ` AND l.tipo_lixo ILIKE $${paramIndex++}`;
        params.push(`%${tipo_lixo}%`);
    }
    if (nome_ponto) {
        sql += ` AND pc.nome_ponto ILIKE $${paramIndex++}`;
        params.push(`%${nome_ponto}%`);
    }

    sql += ` ORDER BY l.data_postagem DESC;`;

    try {
        const { rows } = await pool.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar lixos do reciclador:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar lixos do reciclador.' });
    }
});


// PUT /lixo/:id_lixo/cancelar-reciclador - Reciclador cancela a coleta (volta para 'Pendente')
app.put('/lixo/:id_lixo/cancelar-reciclador', async (req, res) => {
    const { id_lixo } = req.params;
    const { id_reciclador_fk } = req.body; // Para garantir que apenas o reciclador responsável pode cancelar

    if (!id_reciclador_fk) {
        return res.status(400).json({ message: 'ID do reciclador é obrigatório para cancelar a coleta.' });
    }

    try {
        const { rows: lixoExistente } = await pool.query('SELECT status, id_reciclador_fk FROM lixo WHERE id_lixo = $1;', [id_lixo]);

        if (lixoExistente.length === 0) {
            return res.status(404).json({ message: 'Lixo não encontrado.' });
        }

        if (lixoExistente[0].id_reciclador_fk.toString() !== id_reciclador_fk.toString()) {
            return res.status(403).json({ message: 'Você não tem permissão para cancelar a coleta deste lixo.' });
        }

        if (lixoExistente[0].status === 'Coletado' || lixoExistente[0].status === 'Cancelado') {
            return res.status(400).json({ message: 'Não é possível cancelar uma coleta já concluída ou cancelada.' });
        }

        const sql = `UPDATE lixo SET status = 'Pendente', id_reciclador_fk = NULL WHERE id_lixo = $1 RETURNING *;`;
        const { rows } = await pool.query(sql, [id_lixo]);
        res.status(200).json({ message: 'Coleta cancelada pelo reciclador, lixo voltou a ser Pendente.', lixo: rows[0] });
    } catch (err) {
        console.error('Erro ao cancelar coleta pelo reciclador:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao cancelar coleta.' });
    }
});

// PUT /lixo/:id_lixo/confirmar - Reciclador confirma a coleta (status 'Coletado')
app.put('/lixo/:id_lixo/confirmar', async (req, res) => {
    const { id_lixo } = req.params;
    const { id_reciclador_fk } = req.body; // Para garantir que apenas o reciclador responsável pode confirmar

    if (!id_reciclador_fk) {
        return res.status(400).json({ message: 'ID do reciclador é obrigatório para confirmar a coleta.' });
    }

    try {
        const { rows: lixoExistente } = await pool.query('SELECT status, id_reciclador_fk FROM lixo WHERE id_lixo = $1;', [id_lixo]);

        if (lixoExistente.length === 0) {
            return res.status(404).json({ message: 'Lixo não encontrado.' });
        }

        if (lixoExistente[0].id_reciclador_fk.toString() !== id_reciclador_fk.toString()) {
            return res.status(403).json({ message: 'Você não tem permissão para confirmar a coleta deste lixo.' });
        }

        if (lixoExistente[0].status !== 'Reciclador à caminho') {
            return res.status(400).json({ message: 'Não é possível confirmar um lixo que não está "Reciclador à caminho".' });
        }

        const data_coleta = new Date(); // Timestamp atual da coleta
        const sql = `UPDATE lixo SET status = 'Coletado', data_coleta = $1 WHERE id_lixo = $2 RETURNING *;`;
        const { rows } = await pool.query(sql, [data_coleta, id_lixo]);
        res.status(200).json({ message: 'Coleta confirmada com sucesso.', lixo: rows[0] });
    } catch (err) {
        console.error('Erro ao confirmar coleta:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao confirmar coleta.' });
    }
});

// =======================================================================
// ROTAS PARA COMENTÁRIOS
// =======================================================================

// POST /lixo/:id_lixo/comentarios - Adicionar um comentário a um lixo
app.post('/lixo/:id_lixo/comentarios', async (req, res) => {
    const { id_lixo } = req.params;
    const { id_usuario_fk, texto } = req.body; // id_usuario_fk virá do frontend

    if (!id_usuario_fk || !texto) {
        return res.status(400).json({ message: 'ID do usuário e texto do comentário são obrigatórios.' });
    }

    try {
        // Opcional: Verificar se o id_lixo existe
        const { rows: lixoExist } = await pool.query('SELECT 1 FROM lixo WHERE id_lixo = $1;', [id_lixo]);
        if (lixoExist.length === 0) {
            return res.status(404).json({ message: 'Lixo não encontrado para adicionar comentário.' });
        }

        const sql = `
            INSERT INTO comentario (id_lixo_fk, id_usuario_fk, texto)
            VALUES ($1, $2, $3) RETURNING *;
        `;
        const { rows } = await pool.query(sql, [id_lixo, id_usuario_fk, texto]);
        res.status(201).json({ message: 'Comentário adicionado com sucesso!', comentario: rows[0] });
    } catch (err) {
        console.error('Erro ao adicionar comentário:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao adicionar comentário.' });
    }
});

// GET /lixo/:id_lixo/comentarios - Listar comentários de um lixo específico
app.get('/lixo/:id_lixo/comentarios', async (req, res) => {
    const { id_lixo } = req.params;

    try {
        const sql = `
            SELECT
                c.id_comentario,
                c.texto,
                c.data_comentario,
                u.nome_usuario,
                u.tipo_usuario
            FROM
                comentario c
            JOIN
                usuario u ON c.id_usuario_fk = u.id_usuario
            WHERE
                c.id_lixo_fk = $1
            ORDER BY
                c.data_comentario ASC;
        `;
        const { rows } = await pool.query(sql, [id_lixo]);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar comentários:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar comentários.' });
    }
});

// =======================================================================
// ROTAS PARA ESTATÍSTICAS DO DASHBOARD (PRODUTOR e RECICLADOR)
// =======================================================================

// GET /dashboard/produtor/stats/:id_produtor
app.get('/dashboard/produtor/stats/:id_produtor', async (req, res) => {
    const { id_produtor } = req.params;
    try {
        // Lixo total depositado
        const totalLixo = await pool.query('SELECT COUNT(*) FROM lixo WHERE id_produtor_fk = $1;', [id_produtor]);
        
        // Lixo depositado esta semana
        const lixoSemana = await pool.query(`
            SELECT COUNT(*) FROM lixo
            WHERE id_produtor_fk = $1
            AND data_postagem >= date_trunc('week', NOW());
        `, [id_produtor]);
        
        // Lixo depositado este mês
        const lixoMes = await pool.query(`
            SELECT COUNT(*) FROM lixo
            WHERE id_produtor_fk = $1
            AND data_postagem >= date_trunc('month', NOW());
        `, [id_produtor]);

        // Últimos 5 lixos coletados (status 'Coletado')
        const lixoColetado = await pool.query(`
            SELECT id_lixo, nome_lixo, tipo_lixo, data_coleta
            FROM lixo
            WHERE id_produtor_fk = $1 AND status = 'Coletado'
            ORDER BY data_coleta DESC
            LIMIT 5;
        `, [id_produtor]);

        res.status(200).json({
            total: parseInt(totalLixo.rows[0].count),
            semana: parseInt(lixoSemana.rows[0].count),
            mes: parseInt(lixoMes.rows[0].count),
            coletados_recentes: lixoColetado.rows
        });

    } catch (err) {
        console.error('Erro ao buscar estatísticas do produtor:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar estatísticas do produtor.' });
    }
});

// GET /dashboard/reciclador/stats/:id_reciclador
app.get('/dashboard/reciclador/stats/:id_reciclador', async (req, res) => {
    const { id_reciclador } = req.params;
    try {
        // Lixo total coletado
        const totalColetado = await pool.query('SELECT COUNT(*) FROM lixo WHERE id_reciclador_fk = $1 AND status = \'Coletado\';', [id_reciclador]);
        
        // Lixo coletado esta semana
        const coletadoSemana = await pool.query(`
            SELECT COUNT(*) FROM lixo
            WHERE id_reciclador_fk = $1 AND status = 'Coletado'
            AND data_coleta >= date_trunc('week', NOW());
        `, [id_reciclador]);
        
        // Lixo coletado este mês
        const coletadoMes = await pool.query(`
            SELECT COUNT(*) FROM lixo
            WHERE id_reciclador_fk = $1 AND status = 'Coletado'
            AND data_coleta >= date_trunc('month', NOW());
        `, [id_reciclador]);
        
        // Últimos 5 lixos "Reciclador à caminho"
        const aCaminho = await pool.query(`
            SELECT id_lixo, nome_lixo, tipo_lixo, data_postagem
            FROM lixo
            WHERE id_reciclador_fk = $1 AND status = 'Reciclador à caminho'
            ORDER BY data_postagem ASC
            LIMIT 5;
        `, [id_reciclador]);

        res.status(200).json({
            total_coletado: parseInt(totalColetado.rows[0].count),
            coletado_semana: parseInt(coletadoSemana.rows[0].count),
            coletado_mes: parseInt(coletadoMes.rows[0].count),
            a_caminho_recentes: aCaminho.rows
        });

    } catch (err) {
        console.error('Erro ao buscar estatísticas do reciclador:', err.message);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar estatísticas do reciclador.' });
    }
});


// Inicia o servidor Express na porta especificada
app.listen(port, () => {
    console.log(`Servidor backend rodando em http://localhost:${port}`);
    console.log('Aguardando requisições do frontend...');
});