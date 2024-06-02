"use strict";
// 1. Load required modules
const express = require("express");
const fs = require("fs/promises");
const cors = require("cors");
const app = express();
app.use(express.static("public"));
app.use(cors());

// 2. Add routes and other middleware and functions here
app.get("/teams", async (req, res, next) => {
    try {
        const fileContent = await fs.readFile("data/pokemon-teams.txt", "utf8");
        const teamsArray = JSON.parse(fileContent);
        res.json(teamsArray);

    } catch(err) {
        console.log(err);
    }
});

// 3. Start the app on an open port!
const PORT = process.env.PORT || 8000;
app.listen(PORT);