const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(express.urlencoded({extended: true})) 

const MongoClient = require('mongodb').MongoClient;

var db;
//몽고db로 연결
MongoClient.connect('mongodb+srv://rlaghdtlr012:1q2w3e4r5t!@cluster0.ci2ii.mongodb.net/?retryWrites=true&w=majority',function(error, client){
    
    app.listen(8080, function(){
    console.log("listening to 8080");
    });

    if(error){
        return console.log(error);
    }
    //hongshikDB로 db연결
    db = client.db('hongshikDB');

    //post라는 파일에 insertOne{자료}를 저장
    db.collection('post').insertOne({이름 : 'Kim', 나이 : 28, _id : 100}, function(error, result){
        console.log('저장완료');
    });

    //어떤 사람이 /add 경로로 POST 요청을 하면 데이터 2(제목, 날짜)개를 보내주는데,
    // 이 때, 'post'라는 이름을 가진 collection에 두 개 데이터를 저장하기.
    app.post('/add', function(req, res){
    res.send('전송완료');
    console.log(req.body.title);
    console.log(req.body.date);
    db.collection('post').insert({제목 : req.body.title, 날짜 : req.body.date}, function(error, result){
        console.log('저장완료');
    });
    // db에 영구 저장하기 위한 명령어 필요
})
});

app.get('/', function(req, res){
    res.sendFile(__dirname + '/main.html');
});