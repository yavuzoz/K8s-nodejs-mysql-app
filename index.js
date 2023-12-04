const path = require('path');
const express = require('express');
const multer = require('multer');
const { marked } = require('marked');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;
const mysqlConfig = {
  host: 'localhost',
  user: 'root', // MySQL kullanıcı adınız
  password: 'aswq', // MySQL şifreniz
  database: 'mydatabase',
};

async function initMySQL() {
  console.log('Initialising MySQL...');
  let connection;
  let success = false;

  while (!success) {
    try {
      connection = await mysql.createConnection(mysqlConfig);
      success = true;
    } catch (error) {
      console.log('Error connecting to MySQL, retrying in 1 second');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('MySQL initialised');
  return connection;
}

async function start() {
  const db = await initMySQL();

  app.set('view engine', 'pug');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/', async (req, res) => {
    res.render('index', { notes: await retrieveNotes(db) });
  });

  app.post(
    '/note',
    multer({ dest: path.join(__dirname, 'public/uploads/') }).single('image'),
    async (req, res) => {
      if (!req.body.upload && req.body.description) {
        await saveNote(db, { description: req.body.description });
        res.redirect('/');
      } else if (req.body.upload && req.file) {
        const link = `/uploads/${encodeURIComponent(req.file.filename)}`;
        res.render('index', {
          content: `${req.body.description} ![](${link})`,
          notes: await retrieveNotes(db),
        });
      }
    },
  );

  app.listen(port, () => {
    console.log(`App listening on http://localhost:${port}`);
  });
}

async function saveNote(connection, note) {
  await connection.execute('INSERT INTO notes (description) VALUES (?)', [note.description]);
}

async function retrieveNotes(connection) {
  const [rows] = await connection.execute('SELECT * FROM notes');
  const notes = rows.reverse();
  return notes.map(it => ({ ...it, description: marked(it.description) }));
}

start();
