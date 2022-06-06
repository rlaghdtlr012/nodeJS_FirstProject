const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(express.urlencoded({extended: true})) 

const MongoClient = require('mongodb').MongoClient;
// ejs engine을 쓰겠다고 선언
app.set('view engine', 'ejs');

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
    //counter db에서 name이 게시물갯수 인 것을 찾아서 그것의 totalPost를 console.log에 찍는다
    db.collection('counter').findOne({name : '게시물갯수'}, function(error, result){
        console.log(result.totalPost);
        var totalPostNum = result.totalPost;
        //글을 발행해주세요.
        db.collection('post').insertOne({ _id : totalPostNum + 1, 제목 : req.body.title, 날짜 : req.body.date}, function(error, result){
            console.log('저장완료');
            //counter라는 콜렉션에 있는 totalPost라는 항목도 1 증가시켜야함(수정);
            db.collection('counter').updateOne({name : '게시물갯수'},{ $inc : {totalPost:1} },function(error, result){
                if(error){return console.log(error);}
            })
        });
    });
})
});

//메인페이지로 접속하면 main.html 보여줌
app.get('/', function(req, res){
    res.sendFile(__dirname + '/main.html');
});

//get요청으로 list 페이지로 접속하면 실제 db에 저장된 데이터들로 예쁘게 꾸며진 list.html 보여줌
app.get('/list', function(req,res){
    //db에 저장된 post라는 collection안의 모든 데이터를 꺼내주세요
    db.collection('post').find().toArray(function(error, result){ // 다 찾아주세요~
        console.log(result);
        //찾은 db 내용을 ejs 파일에 집어넣어주세요
        res.render('list.ejs', { posts : result });// posts라는 이름으로 결과가 전달된다.
    });
});