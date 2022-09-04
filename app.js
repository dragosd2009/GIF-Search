const express = require("express");
const app = express();
const axios = require("axios");
const sqlite3 = require("sqlite3");

let count = 1;
const HOST = "localhost";
const PORT = process.env.PORT || 8888;
const KEY = "rbz67hBwSB6KkkGKhzVOT6QKNhG965Ml";
const currentTime = new Date();
const db = new sqlite3.Database("./db.sqlite3", (err) => {
  if (err) {
    throw new Error("Error opening database " + err.message);
  }
});

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(express.json());
let term = null;

app.get("/", (req, res) => {
  let limit = 50;
  let offset = 0;

  console.log("DDDD", req.query);

  if (req.query.search != null) {
    term = req.query.search;
  }

  if (req.query.limit != 50) {
    limit = req.query.limit;
  }

  if (req.query.offset != 0) {
    offset = parseInt(req.query.offset);
  }

  const gURL =
    "https://api.giphy.com/v1/gifs/search?api_key=" +
    KEY +
    "&q=" +
    term +
    "&limit=" +
    limit +
    "&offset=" +
    offset +
    "&lang=en";

  console.log("GIPHY URL: ", gURL);

  const getData = async (gURL) => {
    try {
      const response = await axios.get(gURL).then((res) => res.data);

      const pagination = {
        totalCount: response.pagination.total_count,
        count: response.pagination.count,
        page: offset / limit,
      };

      const gifUrls = response.data.map((gifObject) => gifObject.url);

      const formattedResponse = {
        data: gifUrls,
        pagination,
      };
      res.send(formattedResponse);
      insertSearchTerm(term, gifUrls, response.pagination.total_count);
    } catch (error) {
      throw new Error(err);
    }
  };

  getData(gURL);
});

app.get("/data", (req, res) => {
  db.all(`SELECT * FROM SearchTerms`, [], (err, rows) => {
    if (err) {
      throw new Error(err);
    }
    res.status(200).json(rows);
  });
});

function insertSearchTerm(term, gifUrls, totalCount) {
  /*  Check here if the searchTerm is already in the database, and
      if it is, do not insert in DB, but make the api call to get the results 
      and update search term data:the count(how many times it was searched),totalCount and updatedAt.
     */
  db.get(
    "SELECT term,count FROM SearchTerms WHERE term =?",
    term,
    (err, row) => {
      if (err) {
        throw new Error(err);
      }
      if (!row) {
        //here the database is empty, no need for checking if search term is there
        const insertQuerySearches =
          "INSERT INTO SearchTerms (term,count,createdAt,updatedAt,totalCount) VALUES(?,?,?,?,?)";
        db.run(insertQuerySearches, [
          term,
          count,
          currentTime,
          currentTime,
          totalCount,
        ]);
      } else {
        //will check if search term already exists
        if (row.term === term) {
          //item already exists
          const updateQuery =
            "UPDATE SearchTerms SET count=?, updatedAt=?, totalCount=? WHERE term =? ";
          let updatedTime = new Date();
          db.run(updateQuery, [row.count + 1, updatedTime, totalCount, term]);
        } else {
          //unique item
          const insertQuerySearches =
            "INSERT INTO SearchTerms (term,count,createdAt,updatedAt,totalCount) VALUES(?,?,?,?,?)";
          db.run(insertQuerySearches, [
            term,
            count,
            currentTime,
            currentTime,
            totalCount,
          ]);
        }
      }
    }
  );
}

function closeDB() {
  db.close((err) => {
    if (err) console.log(err.message);
    else console.log("Closed the database connection.");
  });
}

app.listen(PORT, () => console.log(`API Running at ${HOST}:${PORT}!`));

process.on("SIGINT", () => {
  console.log("\nClosing the database connection");
  closeDB();
  process.exit();
});
