const express = require('express')
const app = express()
const fs = require('fs')
const template = require('./lib/template.js');
const path = require('path')
const sanitizeHtml = require('sanitize-html')
const bodyParser = require('body-parser')
const compression = require('compression')
//app.use를 통해 미들웨어를 return하는 함수가 장착되어 어플리케이션에 요청이 들어올 때마다 미들웨어를 실행함.
app.use(bodyParser.urlencoded({ extended: false })) //=> bodyparser 미들웨어는 사용자가 보낸 post데이터를 분석해서 사용가능하도록 만들어 줌(BODY)
app.use(compression()) // => compression의 미들웨어는 데이터의 양을 압축하여 전송하는 기능.

app.use((req, res, next) => {                  //자주 겹치는 함수 위주로 직접 미들웨어를 작성할 수 있음.
  fs.readdir('./data', (err, filelist) => {
    req.list = filelist                     //req.list라는 새로운 공간에 filelist를 넣어줌.                   //해당 미들웨어를 이용하지 않는 코드들의 메모리 낭비를 막기위해 app.get("*", ...)의 형태로 미들웨어의 사용범위 제한을 걸 수 있음.
    next()
  })
})

app.get('/', (req, res) => {            // 주어진 경로로 get요청이 들어왔을 때 함수를 실행(parameter로 요청과 응답을 받음)
  var title = 'Welcome';
  var description = 'Hello, Node.js';
  var list = template.list(req.list);
  var html = template.HTML(title, list,
    `<h2>${title}</h2>${description}`,
    `<a href="/create">create</a>`
  );
  res.send(html);
})

app.get('/page/:pageId', (req, res) => {
  var filteredId = path.parse(req.params.pageId).base;
  fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
    if (err) {
      next(err)
    } else {
      var title = req.params.pageId
      var sanitizedTitle = sanitizeHtml(title);
      var sanitizedDescription = sanitizeHtml(description, {
        allowedTags: ['h1']
      });
      var list = template.list(req.list);
      var html = template.HTML(sanitizedTitle, list,
        `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
        ` <a href="/create">create</a>
          <a href="/update/${sanitizedTitle}">update</a>
          <form action="/delete_process" method="post">
            <input type="hidden" name="id" value="${sanitizedTitle}">
            <input type="submit" value="delete">
          </form>`
      );
      res.send(html)
    }
  });
})

app.get('/create', (req, res) => {
  var title = 'WEB - create';
  var list = template.list(req.list);
  var html = template.HTML(title, list, `
      <form action="/create_process" method="post">
        <p><input type="text" name="title" placeholder="title"></p>
        <p>
          <textarea name="description" placeholder="description"></textarea>
        </p>
        <p>
          <input type="submit">
        </p>
      </form>
    `, '');
  res.send(html);
})

app.post('/create_process', (req, res) => {
  var post = req.body  //미들웨어를 통해 body형식의 데이터가 만들어짐
  var title = post.title;
  var description = post.description;
  fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
    res.redirect(`/page/${title}`);
    res.end();
  })
})

app.get('/update/:pageId', (req, res) => {
  var filteredId = path.parse(req.params.pageId).base;
  fs.readFile(`data/${filteredId}`, 'utf8', (err, description) => {
    var title = req.params.pageId
    var list = template.list(req.list);
    var html = template.HTML(title, list,
      `
        <form action="/update_process" method="post">
          <input type="hidden" name="id" value="${title}">
          <p><input type="text" name="title" placeholder="title" value="${title}"></p>
          <p>
            <textarea name="description" placeholder="description">${description}</textarea>
          </p>
          <p>
            <input type="submit">
          </p>
        </form>
        `,
      `<a href="/create">create</a> <a href="/update/${title}">update</a>`
    );
    res.send(html);
  });
})

app.post('/update_process', (req, res) => {
  var post = req.body;
  var id = post.id;
  var title = post.title;
  var description = post.description;
  fs.rename(`data/${id}`, `data/${title}`, function (error) {
    fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
      res.redirect(`/page/${title}`);
      res.end();
    })
  });
});

app.post('/delete_process', (req, res) => {
  var post = req.body
  var id = post.id;
  var filteredId = path.parse(id).base;
  fs.unlink(`data/${filteredId}`, function (error) {
    res.redirect(`/`);
    res.end();
  })
});

app.use((req, res, next) => {
  res.status(404).send('Not Found')               //미들웨어는 순차적으로 실행되므로 마지막까지 찾을 수 없는 페이지에 대한 오류 구문 
})

app.listen(3000, () => {                          //정해진 포트에 접근하여 성공하면 함수를 실행
  console.log('서버가 돌아가고 있어요!')
})
