/*
 * Name: Allam Amzad
 * Email: aamzad@caltech.edu
 * Date: 6/14/2024
 * 
 * This file implements the back-end functionality for the Pokemon store,
 * allowing a user to access a Pokemon Showdown recommended team,
 * retrieve Pokemon listings and their information on the store (can
 * be filtered), leave comments for each Pokemon, change Pokemon into
 * shiny, and contact the store. This file uses files in /data to retrieve
 * information.
 */

"use strict";
// 1. Load required modules
const express = require("express");
const fs = require("fs/promises");
const cors = require("cors");
const app = express();
const parse = require('csv-parse/sync');
const multer = require("multer");
// Source tutorial: https://www.npmjs.com/package/csv-writer
const csvWriterGenerate = require('csv-writer').createObjectCsvWriter;
app.use(cors());
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 
app.use(multer().none());
app.use(express.static("public"));

// Status codes/
const CLIENT_ERR_CODE = 400;
const SERVER_ERR_CODE = 500;
const SERVER_ERROR = "An error ocurred on the server, please try again later.";

// Headers of the pokemon.csv file.
const POKEMON_HEADERS = ["id", "name", "rank", "generation", "evolves_from", "type1",
                        "type2", "hp", "atk", "def", "spatk", "spdef", "speed", 
                        "total", "height", "weight", "abilities", "desc"];
// Headers of the comment files.
const COMMENT_HEADERS = ["id", "comment"];
// Headers of the contact file.
const CONTACT_HEADERS = ["name", "email", "message"];
//Headers of the shiny file.
const SHINY_HEADERS = ["name", "shiny"];

// All Pokemon types.
const TYPES = ["normal", "fire", "water", "electric", "grass", "ice", 
    "fighting", "poison", "ground", "flying", "psychic",
    "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
 
/**
 * This API supports the following endpoints:
 * GET /teams
 * GET /pokemon
 * GET /info
 * GET /info/:name
 * GET /comments/:name
 * GET /shiny/:name
 * POST /review/:name
 * POST /contact
 * POST /update/:name
 */

/**
 * Retrieves the Pokemon Showdown Teams from the data/pokemon-teams.txt file,
 * containing all the queried Pokemon. Returns a random team if there exists
 * no team with all the queried Pokemon.
 * Queries: ["p1", "p2", "p3", "p4", "p5", "p6"], where each p_i is a pokemon's name
 * Example: ["Charizard", "Bulbasaur", "Hitmonlee", "Arceus", "Darkrai", "Mew"]
 * Responds with a 500 error if an error occurred in reading/parsing text file.
 */
app.get("/teams", async (req, res) => {
    const pokemonInCart = req.query;
    try {
        const fileContent = await fs.readFile("data/pokemon-teams.txt", "utf8");
        const teamsArray = JSON.parse(fileContent);
        const parsedTeams = parseTeams(teamsArray, pokemonInCart);
        res.json(parsedTeams);
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Retrieves all the Pokemon listed on the shop.
 * Example: ["Bulbasaur", "Ivysaur", "Venasaur", "Charmander", ...]
 * Responds with a 500 error if an error occurred in reading/parsing csv file.
 */
app.get("/pokemon", async (req, res) => {
    try {
        const csvContent = await fs.readFile("data/pokemon.csv");
        const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, 
            columns: POKEMON_HEADERS, 
            on_record: (record) => capitalizeName(record["name"])});
        res.json(records);
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Retrieves information about Pokemon with the specified type selections or search.
 * By default, there is no search query and no types are filtered out (Each type query 
 * is set to "true").
 * Example: [{
 *   id: 1,
 *   name: bulbasaur,
 *   rank: ordinary,
 *   generation: generation-i,
 *   evolves_from: nothing,
 *   type1: grass,
 *   type2: poison
 *   ...
 * },
 * {
 *   id: 2,
 *   name: ivysaur,
 *   rank: ordinary,
 *   generation: generation-i,
 *   evolves_from: bulbasaur,
 *   type1: grass,
 *   type2: poison
 *   ...
 * },
 * ...,
 * ]
 * Responds with a 500 error if an error occurred in reading/parsing csv file.
 */
app.get("/info", async (req, res) => {
    try {
        const csvContent = await fs.readFile("data/pokemon.csv");
        const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, 
            columns: POKEMON_HEADERS, 
            on_record: (record) => filterPokemon(record, req.query)});
        res.json(records);
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Retrieves information about a specific Pokemon listed on the shop.
 * Example: {
 *   id: 1,
 *   name: bulbasaur,
 *   rank: ordinary,
 *   generation: generation-i,
 *   evolves_from: nothing,
 *   type1: grass,
 *   type2: poison
 *   ...
 * }
 * Responds with a 400 error if there exists no Pokemon with the specified
 * name and a 500 error if an error occurred in reading/parsing csv file.
 */
app.get("/info/:name", async (req, res) => {
    const pokemonName = req.params.name.toLowerCase();
    try {
        const csvContent = await fs.readFile("data/pokemon.csv");
        const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, 
            columns: POKEMON_HEADERS, 
            on_record: (record) => checkPokemonName(record, pokemonName)});
        if (records.length === 0) {
            res.status(CLIENT_ERR_CODE).send("Pokemon does not exist.");
        } else {
            res.json(records[0]);
        }
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Retrieves the comments about the Pokemon listed on the shop.
 * Responds with a 500 error if an error occurred in reading/parsing csv file
 */
app.get("/comments/:name", async (req, res) => {
    const pokemonName = req.params.name.toLowerCase();
    try {
        const csvContent = await fs.readFile("data/comments/" + pokemonName + ".csv");
        if (!csvContent) {
            res.status(CLIENT_ERR_CODE).send("Pokemon name was not found.");
        } else {
            const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, 
                columns: COMMENT_HEADERS});
            res.json(records);
        }
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Retrieves whether a Pokemon's image should be shiny or not on the shop.
 * Responds with a 400 error if there exists no Pokemon with the specified
 * name and a 500 error if an error occurred in reading/parsing csv file.
 */
app.get("/shiny/:name", async (req, res) => {
    const pokemonName = req.params.name.toLowerCase();
    try {
        const csvContent = await fs.readFile("data/shiny.csv");
        const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, 
            columns: SHINY_HEADERS});
        let pokemonShiny;
        for (let i = 0; i < records.length; i++) {
            if (records[i]['name'] === pokemonName) {
                pokemonShiny = records[i]['shiny'];
                break;
            }
        }
        if (!pokemonShiny) {
            res.status(CLIENT_ERR_CODE).send("Pokemon name was not found.");
        } else {
            res.type("text");
            res.send(pokemonShiny);
        }
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Leave a review for the Pokemon listed on the shop.
 * Responds with a success message if review message is
 * successful.
 * Responds with a 500 error if an error occurred in reading/parsing csv file.
 */
app.post("/review/:name", async (req, res) => {
    const pokemonName = req.params.name.toLowerCase();
    const review = req.body.review;
    const csvFilePath = 'data/comments/' + pokemonName + '.csv';
    try {
        const csvContent = await fs.readFile(csvFilePath);
        const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, 
            columns: COMMENT_HEADERS});
        const reviewID = (records.length + 1).toString();
        const csvWriter = csvWriterGenerate({
            path: csvFilePath,
            header: [
                {id: 'id', title: 'id'},
                {id: 'comment', title: 'comment'}
            ]
        });
        const allRecords = records;
        allRecords.push({id: reviewID, comment: review});
        csvWriter.writeRecords(allRecords);
        res.type("text");
        res.send(`Successfully left review to ${req.params.name} product page.`);
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Leave a contact message for the Pokemon shop.
 * Responds with a success message if contact message is
 * successful.
 * Responds with a 500 error if an error occurred in reading/parsing csv file.
 */
app.post("/contact", async (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const message = req.body.message;
    const csvFilePath = 'data/contact.csv';
    try {
        const csvContent = await fs.readFile(csvFilePath);
        const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, 
            columns: CONTACT_HEADERS});
        const csvWriter = csvWriterGenerate({
            path: csvFilePath,
            header: [
                {id: 'name', title: 'name'},
                {id: 'email', title: 'email'},
                {id: 'message', title: 'message'}
            ]
        });
        const allRecords = records;
        allRecords.push({name: name, email: email, message: message});
        csvWriter.writeRecords(allRecords);
        res.type("text");
        res.send("Your message has been received.");
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/**
 * Updates the shiny status of a Pokemon on the Pokemon shop.
 * Responds with a 500 error if an error occurred in reading/parsing csv file.
 */
app.post("/update/:name", async (req, res) => {
    const pokemonName = req.params.name.toLowerCase();
    const csvFilePath = 'data/shiny.csv';
    try {
        let pokemonRecordShiny = "";
        let result;
        const csvContent = await fs.readFile(csvFilePath);
        const records = parse.parse(csvContent, {delimiter: ',', from_line: 2, 
            columns: SHINY_HEADERS,
            on_record: function (record) {
                result = updateShiny(record, pokemonName);
                if (record['name'].toLowerCase() === pokemonName) {
                    pokemonRecordShiny = result['shiny'].toLowerCase();;
                }
                return result;
            }});
        const csvWriter = csvWriterGenerate({
            path: csvFilePath,
            header: [
                {id: 'name', title: 'name'},
                {id: 'shiny', title: 'shiny'},
            ]
        });
        csvWriter.writeRecords(records);
        res.type("text");
        res.send(pokemonRecordShiny);
    } catch(err) {
        res.status(SERVER_ERR_CODE).send(SERVER_ERROR);
    }
});

/* ------------------------------ Helper Functions ------------------------------*/

/**
 * Capitalizes the first letter of each word in a phrase.
 * Ex: "porygon z" -> "Porygon Z"
 * @param {String} name - the string to be capitalized
 * @returns {String} - the capitalized phrase
 */
function capitalizeName(name) {
    let capitalName = "";
    const splitName = name.split(" ");
    for (let i = 0; i < splitName.length; i++) {
        capitalName += splitName[i][0].toUpperCase() + 
        splitName[i].substring(1, splitName[i].length) + " ";
    }
    return capitalName.substring(0, capitalName.length - 1);
}

/**
 * Parses through the /teams queries and finds all Pokemon
 * Showdown teams that contain all the queried Pokemon.
 * @param {Array} allTeams - all Pokemon Showdown Teams
 * @param {Object} pokemonInCart - the queried Pokemon (those in the cart)
 * @returns {Array} - the Pokemon Showdown teams containing all those in query
 */
function parseTeams(allTeams, pokemonInCart) {
    const allPokemon = [];
    const queries = ["p1", "p2", "p3", "p4", "p5", "p6"];
    let queryidx = 0;
    /* Parse the queried Pokemon. */
    while (pokemonInCart[queries[queryidx]]) {
        allPokemon.push(pokemonInCart[queries[queryidx]].toLowerCase());
        queryidx += 1;
    }

    /* Find the Pokemon Showdown team that contain the subset of queried Pokemon. */
    const validTeams = [];
    for (let i = 0; i < allTeams.length; i++) {
        if (subsetTeam(allPokemon, allTeams[i])) {
            validTeams.push(allTeams[i]);
        }
    }

    /* If there are no valid Pokemon Showdown teams, return a random team. */
    if (validTeams.length === 0 || allPokemon.length === 0) {
        return [allTeams[genRandomInt(allTeams.length)]];
    }
    return validTeams;
}

/**
 * Returns true if the Pokemon in the cart are a subset of the 
 * Pokemon Showdown team.
 * @param {Array} cartPokemon -  the queried Pokemon (those in the cart)
 * @param {Array} pokemonTeam - the Pokemon Showdown team
 * @returns {Boolean} - whether the cart Pokemon are a subset of the Showdown team.
 */
function subsetTeam(cartPokemon, pokemonTeam) {
    /* Source for idea: https://dev.to/smpnjn/javascript-check-if-an-array-is-a-subset-of-another-array-95
       Author: Johnny Simpson */
    return cartPokemon.every(function (pokemon) {
        return pokemonTeam.map(e => e.toLowerCase()).includes(pokemon);
    });
}

/**
 * Checks if the Pokemon record's name is the desired Pokemon.
 * @param {JSON} record -  the record containing the Pokemon's information
 * @param {String} pokemon - the name of the Pokemon
 * @returns {JSON} - the record if it is the desired Pokemon, else null.
 */
function checkPokemonName(record, pokemon) {
    if (record["name"].toLowerCase() === pokemon) {
        return record;
    }
    return null;
}

/**
 * Filters the Pokemon out from the returned records if the Pokemon's name
 * doesn't contain the queried search or if the Pokemon's type has been
 * filtered out in the refine search.
 * @param {JSON} record -  the record containing the Pokemon's information
 * @param {Object} query - the user's query for the /info GET call
 * @returns {JSON} - the record if the Pokemon isn't filtered out, else null.
 */
function filterPokemon(record, query) {
    let searchResult = false;
    let typeResult = false;

    // If the user searched a query, check if the Pokemon's name contains it.
    if (!query["search"] || filterPokemonSearch(record, 
        query["search"].toLowerCase())) {
        searchResult = true;
    }
    // Check to see that the Pokemon's type isn't filtered out.
    if (filterPokemonTypes(record, query)) {
        typeResult = true;
    }
    // If name matches search query, and type isn't filtered return the Pokemon's record.
    if (searchResult && typeResult) {
        return record;
    }
    return null;
}

/**
 * Checks to see if the user's search query is contained in the Pokemon's name.
 * @param {JSON} record -  the record containing the Pokemon's information
 * @param {String} search - the user's search query in the Pokemon shop
 * @returns {JSON} - the record if the Pokemon's name contains the search query.
 */
function filterPokemonSearch(record, search) {
    if (record["name"].toLowerCase().includes(search)) {
        return record;
    }
    return null;
}

/**
 * Checks to see if the user's search query is contained in the Pokemon's name.
 * @param {JSON} record -  the record containing the Pokemon's information
 * @param {String} type -  a Pokemon type 
 * @param {Object} query - the user's query for the /info GET call
 * @returns {JSON} - the record if the Pokemon's type isn't filtered out.
 */
function checkPokemonType(record, type, query) {
    if (query[type] == "false" && (record["type1"] == type 
        || record["type2"] == type)) {
        return null;
    }
    return record;
}

/**
 * Checks to see if any of the Pokemon record's types have been filtered out.
 * @param {JSON} record -  the record containing the Pokemon's information
 * @param {Object} query - the user's query for the /info GET call
 * @returns {JSON} - the record if none of the Pokemon's types are filtered out.
 */
function filterPokemonTypes(record, query) {
    for (let i = 0; i < TYPES.length; i++) {
        if (checkPokemonType(record, TYPES[i], query) == null) {
            return null;
        }
    }
    return record;
}

/**
 * Changes the shiny value of the Pokemon if the pokemonName matches the record.
 * @param {JSON} record -  the record containing the Pokemon's information
 * @param {String} pokemonName - the name of the Pokemon
 * @returns {JSON} - the record with a changed shiny value if the name matches
 * the pokemonName.
 */
function updateShiny(record, pokemonName) {
    if (record['name'].toLowerCase() === pokemonName) {
        if (record['shiny'] === 'false') {
            record['shiny'] = 'true';
        } else {
            record['shiny'] = 'false';
        }
    }
    return record;
}

/**
 * Returns a random number from 0 to max.
 * @param {Number} max - the maximum number that can generated.
 * @returns {Number} - a random number from 0 to max.
 */
function genRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// 3. Start the app on an open port!
const PORT = process.env.PORT || 8000;
app.listen(PORT);