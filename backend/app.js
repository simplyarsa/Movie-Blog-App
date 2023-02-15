import express from "express";
import mysql from "mysql";
import cors from 'cors';
import bodyParser from "body-parser";
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser"
const encoder = bodyParser.urlencoded();

const app = express();

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Arsalan1234",
    database: "test"
})

app.use(express.json())
app.use(cors())
app.use("/assets", express.static("assets"));
app.use(cookieParser())
app.use(express.urlencoded({extended:false}));

app.get("/", (req, res) => {
    res.json("Hello this is backend");
})

app.post("/login", function (req, res) {

    const q="SELECT * FROM loginuser WHERE username=?"
    db.query(q, [req.body.username], (err, data)=>{

        if(err) return res.status(500).json(err)
        if(data.length===0) return res.status(404).json("User not found!")
        if(req.body.password!=data[0].password) return res.status(400).json("wrong username or password!");

        const token=jwt.sign({id:data[0].user_id}, "jwtkey");
        const {password, ...other}= data[0]
        res.json({
            uid: data[0].user_id,
            token
        })
        // res.cookie("access_token", token, {
        //     httpOnly: true
        // }).status(200).json(other)
    })
})

const verify=(req, res,next)=>{
    const token=req.body.token
    console.log("Token: ",  token)
    if(token){
        jwt.verify(token, "jwtkey", (err, user)=>{
            if(err){
                return res.status(403).json("Token is not valid")
            }
            req.user=user;
            next()
        })
    }else{
        res.status(401).json("You are not authenticated")
    }
}

app.post("/register", encoder, function (req, res) {

    const q="SELECT * FROM loginuser WHERE username=?"
    db.query(q, [req.body.username], (err, data)=>{
        if(err) return res.json(err)
        if(data.length) return res.status(409).json("User already exists")

        const q="INSERT INTO loginuser (`username`, `password`) VALUES (?)"
        const values=[
            req.body.username,
            req.body.password
        ]
        db.query(q, [values], (err, data)=>{
            if(err) return res.json(err);
            return res.status(200).json("User has been created")
        })
    })
})

app.post("/logout", function (req, res) {
    res.clearCookie("access_token", {
        sameSite: "none",
        secure: true
    }).status(200).json("User has been logged out")
})

app.get("/books", (req, res) => {
    const q= "SELECT * FROM books JOIN loginuser ON books.uid=loginuser.user_id";
    db.query(q, (err, data)=>{
        if(err) return res.json(err)
        else{
            if(data){
                return res.json(data)
            }
        }
    })
})

app.post("/books", (req, res) => {
    const token=req.body.token
    if(!token) return res.status(401).json("Not authenticated")

    jwt.verify(token, "jwtkey", (err, userInfo)=>{
        if(err) return res.status(403).json("Token is not valid")

        const q="INSERT INTO books(`title`, `desc`, `cover`, `price`, `uid`, `genres`, `release_date`) VALUES (?)"
        const values=[
            req.body.book.title,
            req.body.book.desc,
            req.body.book.cover,
            req.body.book.price,
            userInfo.id,
            req.body.book.genres.join(', '),
            req.body.book.release_date
        ]
        
        db.query(q, [values], (err, data)=>{
            if(err) return res.status(500).json(err)

            return res.json("Post has been created!")
        })
    })
})

app.delete("/books/:id", (req, res) => {
    
    const bookId = req.params.id;
    const q = "DELETE FROM books WHERE id= ?"

    db.query(q, [bookId], (err, data) => {
        if (err) return res.json(err);
        return res.json("Book has been deleted successfully")
    })
})


app.put("/books/:id", (req, res) => {
    const bookId = req.params.id;
    const q = "UPDATE books SET `title`= ?, `desc`= ?, `price`= ?, `cover`= ? WHERE id = ?";

    const values = [
        req.body.title,
        req.body.desc,
        req.body.price,
        req.body.cover,
    ];

    db.query(q, [...values, bookId], (err, data) => {
        if (err) return res.send(err);
        return res.json(data);
    });
});


app.listen(4000, () => {
    console.log("Server started on port 4000");
})