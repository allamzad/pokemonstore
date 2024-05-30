/*
 * Name: Allam Amzad
 * Email: aamzad@caltech.edu
 * Date: 5/15/2024
 * 
 * This file implements the functionality for the Spotify Game,
 * allowing a player to search for an pokemon, retrieve their
 * most popular tracks, arrange them in order of most popular
 * to least popular, and get their score. 
 */
(function() {
    "use strict";

    const BASE_URL = "https://pokeapi.co/api/v2/"; 
    const NUM_POKEMON = 1025;
    const POKEMON_PER_PAGE = 9;

    const TYPES = ["normal", "fire", "water", "electric", "grass", "ice", 
                   "fighting", "poison", "ground", "flying", "psychic",
                   "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];

    const POKE_IMG_LIMIT = 650;
    let curPage = 0;
    let allPokemon;
    let filteredPokemon;
    let filteredTypes;
    let searchResults;
    let searchMode = false;
    let filteredMode = false;


    /**
     * Sets up the game, getting an access token and registering event handlers
     * to manage view-switching and search queries.
     * @returns none
     */
    async function init() {
        qs("#prev-btn").addEventListener("click", prevPage);
        console.log("init");
        qs("#prev-btn").disabled = true;
        qs("#next-btn").addEventListener("click", nextPage);
        allPokemon = await getAllPokemon();
        generateAllPokemonPage(allPokemon);
        genRefineSearch();
        setUpSearch();
        const recommendedTeam = await getRecommendationTeams();
        console.log(recommendedTeam);
    }

    /**
     * Uses the 'token' Spotify API endpoint following the Client Credentials flow.
     * https://developer.spotify.com/documentation/general/guides/authorization/client-credentials/
     * Updates the accessToken given the response JSON's token. 
     * @returns the Promise object containing the access token.
     */
    async function getAllPokemon() {
        allPokemon = [];
        filteredTypes = [];
        for (let i = 1; i <= NUM_POKEMON; i++) {
            let resp = await fetch(BASE_URL + "pokemon/" + i, {
                method: "GET"
            })
            .then(checkStatus)
            .then(response => response.json())
            .then(data => allPokemon.push(data))
            .catch(handleError);
       }
       if (NUM_POKEMON <= POKEMON_PER_PAGE) {
           qs("#prev-btn").disabled = true;
           qs("#next-btn").disabled = true;
       }
       qs("#loading-div > img").remove();
       qs("#loading-div p").remove();
       qs("#loading-div").remove();
       return allPokemon;
    }

    /* ------------------------------ Page Navigation Functions ------------------------------ */  

    function generateAllPokemonPage() {
        let allPokemonShop = qs("#all-pokemon");
        if (!searchMode && !filteredMode) {
            generateStandardPage(allPokemonShop);
        } else {
            generateFilteredPage(allPokemonShop);
        }
    }

    function generateStandardPage(allPokemonShop) {
        for (let i = 0; i < POKEMON_PER_PAGE; i++) {
            if (i + curPage * POKEMON_PER_PAGE >= NUM_POKEMON) {
                break;
            }
            let pokemonCard = genPokemonCard(allPokemon[i + curPage * POKEMON_PER_PAGE]);
            allPokemonShop.appendChild(pokemonCard);
        }
    }

    function generateFilteredPage(allPokemonShop) {
        let index = 0;
        let numPokemonOnPage = 0;
        let numToSkip = curPage * POKEMON_PER_PAGE;
        let filteredSearchPokemon = filteredSearchResults()
        while (numPokemonOnPage < POKEMON_PER_PAGE && index < filteredSearchPokemon.length) {
            if (numToSkip <= 0) {
                let pokemonCard = genPokemonCard(filteredSearchPokemon[index]);
                allPokemonShop.appendChild(pokemonCard);
                numPokemonOnPage++;
            }
            numToSkip--;
            index += 1;
        }
    }

    function standardNextPage(prevPageBtn, nextPageBtn) {
        curPage += 1;
        const maxPage = Math.floor((NUM_POKEMON - 1) / POKEMON_PER_PAGE);
        if (curPage === maxPage) {
            nextPageBtn.disabled = true;
        }
        if (curPage > 0) {
            prevPageBtn.disabled = false;
        }
        generateAllPokemonPage();
    }

    function standardPrevPage(prevPageBtn, nextPageBtn) {
        curPage -= 1;
        const maxPage = Math.floor((NUM_POKEMON - 1) / POKEMON_PER_PAGE);
        if (curPage === 0) {
            prevPageBtn.disabled = true;
        } 
        if (curPage < maxPage) {
            nextPageBtn.disabled = false;
        }
        generateAllPokemonPage();
    }

    function filteredSearchResults() {
        let results = []
        if (!filteredMode && searchMode) {
            return searchResults;
        } else if (filteredMode && !searchMode) {
            return filteredPokemon;
        } else if (!filteredMode && !searchMode) {
            return allPokemon;
        }

        for (let i = 0; i < filteredPokemon.length; i++) {
            for (let j = 0; j < searchResults.length; j++) {
                if (filteredPokemon[i].name === searchResults[j].name) {
                    results.push(filteredPokemon[i]);
                }
            }
        }
        return results;
    }

    function filteredNextPage(prevPageBtn, nextPageBtn) {
        curPage += 1;
        const numFilteredResults = filteredSearchResults().length;
        const maxFilteredPage = Math.floor((numFilteredResults - 1) / POKEMON_PER_PAGE);
        if (curPage === maxFilteredPage) {
            nextPageBtn.disabled = true;
        } 
        if (curPage > 0) {
            prevPageBtn.disabled = false;
        }
        generateAllPokemonPage();
    }

    function filteredPrevPage(prevPageBtn, nextPageBtn) {
        curPage -= 1;
        const numFilteredResults = filteredSearchResults().length;
        const maxFilteredPage = Math.floor((numFilteredResults - 1) / POKEMON_PER_PAGE);
        if (curPage === 0) {
            prevPageBtn.disabled = true;
        } 
        if (curPage < maxFilteredPage) {
            nextPageBtn.disabled = false;
        }
        generateAllPokemonPage();
    }

    function nextPage() {
        clearDivider(qs("#all-pokemon"));
        const prevPageBtn = qs("#prev-btn");
        const nextPageBtn = qs("#next-btn");
        if (!filteredMode && !searchMode) {
            console.log("here");
            standardNextPage(prevPageBtn, nextPageBtn);
        } else {
            filteredNextPage(prevPageBtn, nextPageBtn);
        }

    }

    function prevPage() {
        clearDivider(qs("#all-pokemon"));
        const nextPageBtn = qs("#next-btn");
        const prevPageBtn = qs("#prev-btn");
        if (!filteredMode && !searchMode) {
            console.log("here");
            standardPrevPage(prevPageBtn, nextPageBtn);
        } else {
            filteredPrevPage(prevPageBtn, nextPageBtn);
        }
    }

    /* ------------------------------ Pokemon Generation Functions ------------------------------ */  

    function genPokemonType(typeName) {
        const typeDiv = gen("div");
        typeDiv.classList.add("type-div");
        const type = gen("p")
        typeDiv.classList.add(typeName);
        type.textContent = capitalizeName(typeName);
        const typeImg = gen("img");
        typeImg.src = "media/" + typeName + ".png";
        typeImg.alt = typeName;
        typeDiv.appendChild(type);
        typeDiv.appendChild(typeImg);
        return typeDiv;
    }

    function genPokemonImage(pokemonInfo, pokemonHeader) {
        const pokemonImage = gen("img");
        /* Prioritize obtaining the Dream World Artwork because it looks cooler. 
           Later Pokemon do not have this artwork available :( */
        if (pokemonInfo.id < POKE_IMG_LIMIT) {
            pokemonImage.src = pokemonInfo.sprites.other["dream_world"].front_default;
        } else {
            pokemonImage.src = pokemonInfo.sprites.other["official-artwork"].front_default;
        }
        pokemonImage.alt = pokemonHeader.textContent;
        return pokemonImage;
    }

    /**
     * Takes info about an Pokemon and returns an article card
     * with relevant info (h3 and img).
     * @param {Object} pokemonInfo - an object describing the pokemon
     * @return {DOMElement} The element representing an pokemon's card. The format
     * of the returned article is the following:
     * 
     * <article class="shop-card">
     *     <!-- Source: PokeAPI -->
     *    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png" alt="Charizard">
     *    <h2>Charizard</h2>
     *    <div class="poke-types">
     *       <p class="fire">Fire</p>
     *    </div>
     *    <button class="customize-btn">Add to Cart</button>
     * </article>
     */
    function genPokemonCard(pokemonInfo) {
        const pokemonHeader = gen("h2");
        pokemonHeader.textContent = capitalizeName(pokemonInfo.name);

        const pokemonImage = genPokemonImage(pokemonInfo, pokemonHeader);

        const pokemonTypeDiv = gen("div");
        pokemonTypeDiv.classList.add("poke-types");
        const pokemonTypes = pokemonInfo.types

        for (let i = 0; i < pokemonTypes.length; i++) {
            pokemonTypeDiv.appendChild(genPokemonType(pokemonTypes[i].type.name, pokemonTypeDiv));
        }

        const cartButton = gen("button");
        cartButton.classList.add("customize-btn");
        cartButton.textContent = "Customize";

        const pokemonShopCardInfo = gen("div");
        pokemonShopCardInfo.classList.add("shop-card-info-div");
        pokemonShopCardInfo.appendChild(pokemonHeader);
        pokemonShopCardInfo.appendChild(pokemonTypeDiv);

        const pokemonShopCardDiv = gen("div");
        pokemonShopCardDiv.classList.add("shop-card-div");
        pokemonShopCardDiv.appendChild(pokemonShopCardInfo);
        pokemonShopCardDiv.appendChild(pokemonImage);

        const pokemonArticle = gen("article");
        pokemonArticle.classList.add("shop-card");
        pokemonArticle.classList.add(pokemonTypes[0].type.name);
        pokemonArticle.appendChild(pokemonShopCardDiv);
        pokemonArticle.appendChild(cartButton);
        return pokemonArticle;
    }

    /* ------------------------------ Refine Search Functions ------------------------------ */  


    function generateTypeCheckbox(refineSearch, type) {
        const searchDiv = gen("div");
        searchDiv.classList.add("search-div");
        const searchInput = gen("input");
        searchInput.type = "checkbox";
        searchInput.id = type + "-check";
        searchInput.name = type;
        searchInput.checked = "checked";
        searchInput.addEventListener("change", function () {
            if (this.checked) {
                const typeIndex = filteredTypes.indexOf(type);
                filteredTypes.splice(typeIndex, 1);
                console.log(filteredTypes);
            } else {
                filteredTypes.push(type);
            }
            updateFilteredPokemon();
        })
        const searchLabel = gen("label");
        searchLabel.textContent = capitalizeName(type);
        searchDiv.appendChild(searchInput);
        searchDiv.appendChild(searchLabel);
        refineSearch.appendChild(searchDiv);
    }

    function generateRecCheckbox(refineSearch) {
        const recDiv = gen("div");
        recDiv.classList.add("recommendation");
        const recInput = gen("input");
        recInput.type = "checkbox";
        recInput.id =  "rec-check";
        recInput.name = "recommendation toggle";
        recInput.checked = "checked";
        recInput.addEventListener("change", function () {
            if (this.checked) {
                enableRecommendation();
            } else {
                disableRecommendation();
            }
        });
        const recLabel = gen("label");
        recLabel.textContent = "Recommendations"
        recDiv.appendChild(recInput);
        recDiv.appendChild(recLabel);
        refineSearch.appendChild(recDiv);
    }

    function genRefineSearch() {
        let refineSearch = qs("#refine-search");
        const typeHeader = gen("h3");
        typeHeader.textContent = "Types"
        refineSearch.appendChild(typeHeader);
        for (let i = 0; i < TYPES.length; i++) {
            generateTypeCheckbox(refineSearch, TYPES[i]);
        }
        const recHeader = gen("h3");
        recHeader.textContent = "Recommendations"
        refineSearch.appendChild(recHeader);
        generateRecCheckbox(refineSearch);
    }

    function updateFilteredPokemon() {
        filteredPokemon = []
        clearDivider(qs("#all-pokemon"));
        filteredMode = filteredTypes.length > 0;
        if (!filteredMode) {
            filteredPokemon = allPokemon;
        } else {
            for (let i = 0; i < NUM_POKEMON; i++) {
                let pokemonTypes = allPokemon[i].types;
                let pokemonHasFilteredOutType = false;
                for (let j = 0; j < pokemonTypes.length; j++) {
                    for (let k = 0; k < filteredTypes.length; k++) {
                        if (pokemonTypes[j].type.name === filteredTypes[k]) {
                            pokemonHasFilteredOutType = true;
                            break;
                        }
                    }
                    if (pokemonHasFilteredOutType) {
                        break;
                    }
                }
                if (!pokemonHasFilteredOutType) {
                    filteredPokemon.push(allPokemon[i]);
                }
            }
        }

        if (filteredSearchResults().length <= POKEMON_PER_PAGE) {
            console.log("updateFilteredPokemon");
            qs("#prev-btn").disabled = true;
            qs("#next-btn").disabled = true;
        } else {
            console.log("updateFilteredPokemon");
            qs("#prev-btn").disabled = true;
            qs("#next-btn").disabled = false;
        }
        generateAllPokemonPage();
        
    }

    /* --------------- All Pokemon Search Functions ------------------- */  

    function searchPokemon(search) {
        searchResults = [];
        clearDivider(qs("#all-pokemon"));
        curPage = 0;
        searchMode = true;
        const lowerCaseSearch = search.toLowerCase();
        for (let i = 0; i < NUM_POKEMON; i++) {
            if (allPokemon[i].name.toLowerCase().startsWith(lowerCaseSearch)) {
                searchResults.push(allPokemon[i]);
            }
        }
        if (searchResults.length <= POKEMON_PER_PAGE) {
            console.log("searchPokemon");
            qs("#prev-btn").disabled = true;
            qs("#next-btn").disabled = true;
        }
        generateAllPokemonPage();
    }

    function setUpSearch() {
        const searchBar = qs("input");
        searchBar.addEventListener("change", () => {
            if (searchBar.value) {
                searchPokemon(searchBar.value);
            }
        });
        const pokeSearch = qs("#all-pokemon-header > img");
        pokeSearch.addEventListener("click", function () {
            if (searchBar.value) {
                searchPokemon(searchBar.value);
            }
        })
        const clearSearch = qs("#clear-search");
        clearSearch.addEventListener("click",  clearSearchResults);
    }

    function clearSearchResults() {
        clearDivider(qs("#all-pokemon"));
        searchMode = false;
        curPage = 0;
        searchResults = [];
        if (NUM_POKEMON <= POKEMON_PER_PAGE) {
            console.log("clearSearchResults");
            qs("#prev-btn").disabled = true;
            qs("#next-btn").disabled = true;
        } else {
            console.log("clearSearchResults");
            qs("#prev-btn").disabled = true;
            qs("#next-btn").disabled = false;
        }
        generateAllPokemonPage();
    }

    /* ------------------------------ Helper Functions ------------------------------ */  

    /**
     * Removes all the children nodes of the divider element.
     * @param {Object} divider - divider element in the DOM tree to have its children removed
     * @returns none
     */
    function clearDivider(divider) {
        while (divider.hasChildNodes()) {
            divider.removeChild(divider.firstChild);
        }
    }

    function capitalizeName(name) {
        let capitalName = "";
        const splitName = name.split(" ");
        for (let i = 0; i < splitName.length; i++) {
            capitalName += splitName[i][0].toUpperCase() + splitName[i].substring(1, splitName[i].length) + " ";
        }
        return capitalName.substring(0, capitalName.length - 1);
    }

    /* -------------------- Pokemon Showdown Functions -------------------- */  

    async function getRecommendationTeams() {
        let resp = await fetch("http://localhost:8000/teams", {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .then(data => data)
        .catch(handleError);
        return resp;
    }

    function disableRecommendation(self) {


    }

    function enableRecommendation() {
        
    }
    


    /* -------------------- Game Processing -------------------- */  



    /* -------------------- Custom Error-handling -------------------- */  

    /**
     * Displays an error message on the page, hiding any previous results.
     * If errMsg is passed as a string, the string is used to customize an error message.
     * Otherwise (the errMsg is an object or missing), a generic message is displayed.
     * @param {String} errMsg - optional specific error message to display on page.
     */
     function handleError(errMsg) {
        if (typeof errMsg === "string") {
            qs("#message-area").textContent = errMsg;
        } else {
            /* The err object was passed, don't want to show it on the page;
               instead use generic error message. */
            qs("#message-area").textContent =
                "An error ocurred fetching the Spotify data. Please try again later.";
        }
        qs("#message-area").classList.remove("hidden");
    }

    init();
})();
