import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import { log } from "console";
import pg from "pg";
import env from "dotenv";
import bcrypt from "bcrypt";

const app = express();
const port = process.env.PORT || 3000;
const saltingRounds = 10;
env.config();

console.log("My name is ",process.env.Myname);

try {
  const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });

  db.connect((err) => {
    console.log(err);
  });
} catch (error) {
  console.log(error);
}

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/register", async (req, res) => {
  console.log(req.body);
  const userName = req.body.username;
  const mailID = req.body.email;
  const password = req.body.password;
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      mailID,
    ]);
    if (checkResult.rows.length > 0) {
      res.render("login.ejs", {
        error: "User already exists. Please try again.",
      });
    } else {
      const hashedPassword = await bcrypt.hash(password, saltingRounds);
      const InsertResult = await db.query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
        [userName, mailID, hashedPassword]
      );
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error);
    res.redirect("/login");
  }
});

app.post("/login", async (req, res) => {
  console.log(req.body);
  // res.send(req.body)
  const mailID = req.body.email;
  const password = req.body.password;
  console.log(mailID, password);
  if (mailID) {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          mailID,
        ]);
        console.log(result.rows[0].password, password);
        const match = await bcrypt.compare(password, result.rows[0].password);
        console.log(match);
        if (match) {
          const UserContent = await db.query(
            "SELECT * FROM blogs WHERE user_name = $1",
            [result.rows[0].name]
          );
          console.log(UserContent.rows);
          res.render("dashboard.ejs", {
            UserName: result.rows[0].name,
            Content: UserContent.rows,
          });
        } else {
          res.render("login.ejs", { error_msg: "Invalid email or password." });
        }
        
    } catch (error) {
        console.log(error);
        res.render("login.ejs", { error_msg: "Invalid email or password." });
    }
  } else {
    res.render("login.ejs", {
      error_msg: "Please enter both email and password.",
    });
  }
});

app.post("/submit", async (req, res) => {
  console.log(req.body);
  const newTitle = req.body.newTitle;
  const newContent = req.body.newContent;
  const newUserName = req.body.newUser;
  try {
      const Exists = await db.query(
        "SELECT * FROM blogs WHERE user_name = $1 AND title = $2 AND content = $3",
        [newUserName, newTitle, newContent]
      );
      if (Exists.rows.length === 0) {
        const tableSize = await db.query("SELECT COUNT(*) FROM blogs");
        console.log(tableSize.rows[0].count);
        const count = tableSize.rows[0].count;
        await db.query(
          "INSERT INTO blogs (id, user_name, title, content) VALUES ($1, $2, $3,$4)",
          [count + 1, newUserName, newTitle, newContent],
          (err, result) => {
            if (err) {
              console.log(err);
            } else {
              console.log("Data inserted");
            }
          }
        );
      }
      const UserContent = await db.query(
        "SELECT * FROM blogs WHERE user_name = $1",
        [newUserName]
      );
    
  } catch (error) {
    console.log(error);
    
  }
  res.render("dashboard.ejs", {
    UserName: newUserName,
    Content: UserContent.rows,
  });
});

app.post("/delete", async (req, res) => {
  console.log(req.body);
  const Title = req.body.hiddenTitle;
  const user = req.body.hiddenName;
  try {
      await db.query("DELETE FROM blogs WHERE user_name = $1 AND title = $2", [
        user,
        Title,
      ]);
      const UserContent = await db.query(
        "SELECT * FROM blogs WHERE user_name = $1",
        [user]
      );
      res.render("dashboard.ejs", { UserName: user, Content: UserContent.rows });
    
  } catch (error) {
    console.log(error);
    res.render("dashboard.ejs", { UserName: user, Content: "" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
