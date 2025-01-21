const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const jwt = require('jsonwebtoken');

const app = express();
// porta do site
const port = 3001;

// Permitir requisições de origens diferentes (CORS)
app.use(cors());

// Parseamento do corpo das requisições para JSON
app.use(bodyParser.json());



// direção para a pagina inicial do site
app.get('/', (req, res) => {
    //Se estiver nesta rota "/" redireciona para a pagina inicial
    res.redirect('/paginainicial');
    //res.sendFile(path.join(__dirname, '..', 'frontend'));
 });

// Lugar para onde vai quando ligo o servidor
app.use(express.static(path.join(__dirname, '..', 'frontend')));


// Função middleware para verificar o token
function verificarToken(req, res, next) {
    const token = req.headers['authorization'];

    // Verifica se o token foi enviado
    if (!token) {
        return res.status(403).json({ success: false, message: 'Token não fornecido.' });
    }

    // Remove o prefixo "Bearer " do token
    const bearerToken = token.split(' ')[1];

    // Verifica e decodifica o token
    jwt.verify(bearerToken, 'sua_chave_secreta', (err, decoded) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
        }

        // Adiciona os dados decodificados ao objeto `req` para uso posterior
        req.user = decoded;
        next(); // Continua para o próximo middleware ou rota
    });
}

// Função para converter a data para o formato yyyy-mm-dd
function convertDateForDB(dateString) {
    const dateParts = dateString.split('/');
    if (dateParts.length === 3) {
        const day = dateParts[0];
        const month = dateParts[1];
        const year = dateParts[2];
        return `${year}-${month}-${day}`;  // Formato yyyy-mm-dd
    }
    return dateString;  // Caso a data não esteja no formato esperado, retorna a original
}

//  ------------------------- METODOS GET --------------------- 



// 
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'login', 'login.html')); 
});

app.get('/paginainicial', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'paginainicial', 'paginaInicial.html')); 
});

app.get('/reporpass', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'Recuperarpass', 'recuperarpass.html')); 
});

// Rota para enviar o arquivo existe.html
app.get('/existe', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'existe.html')); // Servir a página existe.html
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname,'..', 'frontend', 'signup', 'signup.html'));
});



app.get('/consultas', (req, res) => {
    const { medico, data } = req.query; // Recupera os parâmetros 'medico' e 'data' da requisição

    // Verifica se os parâmetros são fornecidos
    if (!medico || !data) {
        return res.status(400).json({ success: false, message: 'Parâmetros médicos ou de data faltando.' });
    }

    // Formatar a data para o formato que o banco de dados utiliza, caso necessário
    const query = `
        SELECT hora, nome_paciente, telefone, email, nome_medico, tipo_consulta 
        FROM horarios 
        WHERE nome_medico = ? AND DATE(data) = DATE(?)`;

    db.execute(query, [medico, data], (err, results) => {
        if (err) {
            console.error('Erro ao buscar consultas:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar consultas.' });
        }

        // Verificar se resultados foram encontrados
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Nenhum horário encontrado para esta data.' });
        }

        res.status(200).json({ success: true, data: results });
    });
});







app.get('/pedidos', (req, res) => {
    const query = 'SELECT nome_paciente, tipo_consulta, data_consulta, hora_consulta, email, telefone, seguro FROM pedidos';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao obter pedidos:', err);
            res.status(500).send('Erro no servidor');
            return;
        }
        res.json(results);
    });
});


//  ------------------------- METODOS POST --------------------- 


app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Verifica se os campos email e password estão preenchidos
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email e password são obrigatórios.' });
    }

    // Consulta SQL para verificar na tabela 'users' (utilizadores normais)
    const userQuery = 'SELECT * FROM users WHERE email = ?';

    // Consulta SQL para verificar na tabela 'medicos' (médicos)
    const medicoQuery = 'SELECT * FROM medicos WHERE email = ?';

    // Consulta SQL para verificar na tabela 'assistentes' (assistentes)
    const assistenteQuery = 'SELECT * FROM assistentes WHERE email = ?';

    // Executa a consulta na tabela 'users'
    db.execute(userQuery, [email], (err, results) => {
        if (err) {
            console.error('Erro ao executar consulta na tabela "users":', err);
            return res.status(500).json({ success: false, message: 'Erro interno ao verificar as credenciais.' });
        }

        // Se o utilizador não for encontrado na tabela 'users'
        if (results.length === 0) {
            // Procura na tabela 'medicos'
            db.execute(medicoQuery, [email], (err, medicoResults) => {
                if (err) {
                    console.error('Erro ao executar consulta na tabela "medicos":', err);
                    return res.status(500).json({ success: false, message: 'Erro interno ao verificar as credenciais.' });
                }

                // Se o email não for encontrado na tabela 'medicos'
                if (medicoResults.length === 0) {
                    // Procura na tabela 'assistentes'
                    db.execute(assistenteQuery, [email], (err, assistenteResults) => {
                        if (err) {
                            console.error('Erro ao executar consulta na tabela "assistentes":', err);
                            return res.status(500).json({ success: false, message: 'Erro interno ao verificar as credenciais.' });
                        }

                        // Se o email não for encontrado na tabela 'assistentes'
                        if (assistenteResults.length === 0) {
                            return res.status(404).json({ success: false, message: 'Email ou palavra-pass incorretos ' });
                        }

                        const assistente = assistenteResults[0];

                        // Verifica se a palavra-passe fornecida corresponde
                        if (assistente.pass !== password) {
                            return res.status(400).json({ success: false, message: 'Email ou palavra-pass incorretos ' });
                        }

                        // Login bem-sucedido para assistentes
                        return res.status(200).json({
                            success: true,
                            message: 'Login bem-sucedido!',
                            nome: assistente.nome,
                            email: assistente.email,
                            telefone: assistente.telefone,
                            role: 'assistente' // Define o tipo de utilizador como "assistente"
                        });
                    });
                } else {
                    const medico = medicoResults[0];

                    // Verifica se a palavra-passe fornecida corresponde
                    if (medico.pass !== password) {
                        return res.status(400).json({ success: false, message: 'Email ou palavra-pass incorretos ' });
                    }

                    // Login bem-sucedido para médicos
                    return res.status(200).json({
                        success: true,
                        message: 'Login bem-sucedido!',
                        nome: medico.nome,
                        email: medico.email,
                        telefone: medico.telefone,
                        role: 'medico' // Define o tipo de utilizador como "medico"
                    });
                }
            });
        } else {
            // Utilizador encontrado na tabela 'users'
            const user = results[0];

            // Verifica se a palavra-passe fornecida corresponde
            if (user.pass !== password) {
                return res.status(400).json({ success: false, message: 'Email ou palavra-pass incorretos' });
            }

            // Login bem-sucedido para utilizadores normais
            return res.status(200).json({
                success: true,
                message: 'Login bem-sucedido!',
                nome: user.nome,
                email: user.email,
                telefone: user.telefone,
                role: 'user' // Define o tipo de utilizador como "user"
            });
        }
    });
});



// Endpoint para criar novo utilizador
app.post('/signup', (req, res) => {
    const { nome, sobrenomes, email, dataNascimento, telefone, pass } = req.body;

    // Validar se todos os campos estão presentes
    if (!nome || !sobrenomes || !email || !dataNascimento || !telefone || !pass) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios!' });
    }

    // Consultar se o email já existe no banco de dados
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.error('Erro ao consultar email:', err);
            return res.status(500).json({ success: false, message: 'Erro no servidor. Tente novamente mais tarde.' });
        }

        if (result.length > 0) {
            return res.status(400).json({ success: false, message: 'Email já criado.' });
        }

        // Inserir os dados do novo usuário no banco de dados
        const query = `
            INSERT INTO users 
            (nome, sobrenomes, telefone, email, pass, data_nascimento, is_admin, data_criacao)
            VALUES (?, ?, ?, ?, ?, ?, 0, NOW())
        `;

        db.query(query, [nome, sobrenomes, telefone, email, pass, dataNascimento], (err, result) => {
            if (err) {
                console.error('Erro ao inserir usuário:', err);
                return res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário. Tente novamente mais tarde.' });
            }

            return res.status(201).json({ success: true, message: 'Usuário criado com sucesso!' });
        });
    });
});




app.post('/consultas', (req, res) => {
    const { paciente, seguro, telefone, email, medico, tipo_consulta, hora, data } = req.body;

    // Verifica se os dados obrigatórios estão presentes
    if (!paciente || !hora || !data) {
        return res.status(400).json({ success: false, message: 'Paciente, hora e data são obrigatórios.' });
    }

    // Query para inserir os dados na tabela 'horarios'
    const query = `
        INSERT INTO horarios (nome_paciente, seguro, telefone, email, nome_medico, tipo_consulta, hora, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.execute(
        query,
        [paciente, seguro || '', telefone || '', email || '', medico || '', tipo_consulta || '', hora, data],
        (err, results) => {
            if (err) {
                console.error('Erro ao criar consulta:', err);
                return res.status(500).json({ success: false, message: 'Erro ao criar consulta.' });
            }

            res.status(201).json({ success: true, message: 'Consulta marcada com sucesso.' });
        }
    );
});



// Rota POST para inserir um novo pedido
app.post('/pedidos', (req, res) => {
    const { nome_paciente, tipo_consulta, data_consulta, hora_consulta, email, telefone, seguro } = req.body;

    // Validar se todos os campos necessários estão presentes
    if (!nome_paciente || !tipo_consulta || !data_consulta || !hora_consulta || !email || !telefone) {
        res.status(400).send('Todos os campos são obrigatórios!');
        return;
    }

    // Adicionar um campo para o seguro, caso o cliente tenha selecionado
    const queryPedidos = `
        INSERT INTO pedidos (nome_paciente, tipo_consulta, data_consulta, hora_consulta, email, telefone, seguro)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const queryHistorico = `
        INSERT INTO pedidos_historico (nome_paciente, tipo_consulta, data_consulta, hora_consulta, email, telefone, seguro)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    // Inserir os dados na tabela pedidos e pedidos_historico
    db.query(queryPedidos, [nome_paciente, tipo_consulta, data_consulta, hora_consulta, email, telefone, seguro], (err, results) => {
        if (err) {
            console.error('Erro ao inserir pedido:', err);
            res.status(500).send('Erro no servidor: ' + err.message);
            return;
        }

        // Após inserir em "pedidos", inserir em "pedidos_historico"
        db.query(queryHistorico, [nome_paciente, tipo_consulta, data_consulta, hora_consulta, email, telefone, seguro], (errHistorico, resultsHistorico) => {
            if (errHistorico) {
                console.error('Erro ao inserir no histórico:', errHistorico);
                res.status(500).send('Erro no servidor ao inserir no histórico: ' + errHistorico.message);
                return;
            }

            res.status(201).send({ message: 'Pedido criado com sucesso em pedidos e pedidos_historico!', id: results.insertId });
        });
    });
});


// Exemplo de método no servidor para deletar um pedido usando nome, data e hora
app.delete('/delete/pedidos', (req, res) => {
    const { nome_cliente, data_consulta, hora_consulta } = req.body;

    // Validar os dados recebidos
    if (!nome_cliente || !data_consulta || !hora_consulta) {
        return res.status(400).json({ 
            success: false, 
            message: 'Dados incompletos. Certifique-se de enviar nome_cliente, data_consulta e hora_consulta.' 
        });
    }

    // Função para converter a data do formato DD/MM/YYYY para YYYY-MM-DD
    const formatarData = (data) => {
        const partes = data.split('/');
        if (partes.length !== 3) return null;
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`; // YYYY-MM-DD
    };

    const dataConvertida = formatarData(data_consulta);

    if (!dataConvertida) {
        return res.status(400).json({ success: false, message: 'Formato de data inválido. Use DD/MM/YYYY.' });
    }

    const query = `
        DELETE FROM pedidos 
        WHERE nome_paciente = ? AND data_consulta = ? AND hora_consulta = ?
    `;
    db.query(query, [nome_cliente, dataConvertida, hora_consulta], (err, result) => {
        if (err) {
            console.error('Erro ao excluir pedido:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro interno ao excluir o pedido.' 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pedido não encontrado. Verifique os dados enviados.' 
            });
        }

        res.status(200).json({ success: true, message: 'Pedido excluído com sucesso.' });
    });
});









  
app.patch('/consultas/:id', (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
        return res.status(400).json({ success: false, message: 'O estado é obrigatório.' });
    }

    const query = 'UPDATE consultas SET estado = ? WHERE id = ?';
    db.execute(query, [estado, id], (err, results) => {
        if (err) {
            console.error('Erro ao atualizar consulta:', err);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar consulta.' });
        }

        res.json({ success: true, message: 'Consulta atualizada com sucesso.' });
    });
});


app.delete('/consultas/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM consultas WHERE id = ?';
    db.execute(query, [id], (err, results) => {
        if (err) {
            console.error('Erro ao remover consulta:', err);
            return res.status(500).json({ success: false, message: 'Erro ao remover consulta.' });
        }

        res.json({ success: true, message: 'Consulta removida com sucesso.' });
    });
});




// Método GET: Buscar todos os médicos
app.get('/medicos', (req, res) => {
    const query = 'SELECT nome FROM medicos';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao buscar médicos:', err);
            res.status(500).send('Erro ao buscar médicos.');
            return;
        }
        res.json(results);
    });
});



// Rota POST para confirmar a consulta
app.post('/horarios', (req, res) => {
    const dadosConsulta = req.body;

    // Validação de campos obrigatórios
    if (!dadosConsulta.nome_paciente || !dadosConsulta.data || !dadosConsulta.hora) {
        return res.status(400).json({
            success: false,
            message: 'Campos obrigatórios: nome_paciente, data e hora.',
        });
    }

    // Converte a data para o formato yyyy-mm-dd
    const dataConvertida = convertDateForDB(dadosConsulta.data);

    const query = `
        INSERT INTO horarios (nome_paciente, tipo_consulta, nome_medico, email, telefone, data, hora)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        query,
        [
            dadosConsulta.nome_paciente,
            dadosConsulta.tipo_consulta || '',
            dadosConsulta.nome_medico || '',
            dadosConsulta.email || '',
            dadosConsulta.telefone || '',
            dataConvertida, // Usando a data convertida
            dadosConsulta.hora,
        ],
        (err, result) => {
            if (err) {
                console.error('Erro ao confirmar consulta:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro no servidor. Não foi possível confirmar a consulta.',
                });
            }
            res.json({ success: true });
        }
    );
});









// --------------------  Iniciar o servidor ----------------------

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});



