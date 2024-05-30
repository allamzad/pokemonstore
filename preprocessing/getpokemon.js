const pokemon = require('pokemon');

const allPokemon = pokemon.all();

var fs = require('fs');

var file = fs.createWriteStream('all-pokemon.txt');
file.on('error', function(err) { /* error handling */ });
allPokemon.forEach(function(v) { file.write(v + '\n'); });
file.end();