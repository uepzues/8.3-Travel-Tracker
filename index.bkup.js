import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

const __dirname = path.resolve();

dotenv.config();

const app = express();
const port = 3000;

const devConfig = {
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "root",
  port: 5432,
};

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

const db = new pg.Client(dbConfig);

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//check if country has been visited
const checkVisited = async () => {
  const result = await db.query("SELECT country_code FROM visited_countries");

  let countries = [];

  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });

  return countries;
};

// GET home page
app.get("/", async (req, res) => {
  checkVisited().then((countries) => {
    console.log("at get", countries);

    // render the index.ejs template with the countries array and total number of countries
    res.render("index.ejs", { countries: countries, total: countries.length });
  });
});

//INSERT new country
app.post("/add", async (req, res) => {
  //check if country has been visited
  try {
    const input = req.body["country"];
    //search for country
    const searchQuery = `SELECT country_code FROM countries WHERE LOWER(country_name) ILIKE '%' || $1 || '%';`;
    const result = await db.query(searchQuery, [input]);

    let countryAdded = false;
    let countryExists = result.rows.length > 0;

    if (countryExists) {
      //loop through result
      for (let data of result.rows) {
        console.log(data);

        //check if country has been visited
        const visited =
          "SELECT EXISTS(SELECT 1 FROM visited_countries WHERE country_code = $1);";
        const visitedResult = await db.query(visited, [data.country_code]);
        console.log(visitedResult.rows);

        if (!visitedResult.rows[0].exists) {
          const insertQuery = `INSERT INTO visited_countries (country_code) VALUES ($1);`;
          await db.query(insertQuery, [data.country_code]);
          countryAdded = true;
          break;
        }
      }
    }
    const countries = await checkVisited();
    if (countryAdded) {
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
      });
    } else if (!countryExists) {
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        error: "Country does not exist",
      });
    } else {
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        error: "Country already added",
      });
    }
  } catch (err) {
    console.log("from catch", err);
    res.redirect("/");
  }
});

app.post("/reset", async (req, res) => {
  await db.query("DELETE FROM visited_countries");
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
