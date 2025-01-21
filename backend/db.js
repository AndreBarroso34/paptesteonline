const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'pap',
});


connection.connect((err) => {
    if (err) {
        console.error('Erro ao conectar à BD:', err);
        return;
    }
    console.log('Conectado à base de dados!');
});



module.exports = connection;    