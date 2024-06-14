/*
 * Name: Allam Amzad
 * Email: aamzad@caltech.edu
 * Date: 6/14/2024
 * 
 * This file implements the functionality for the Pokemon store,
 * allowing a user to see assemble a Pokemon team, receive
 * team recommendations from Pokemon Showdown Data, customize
 * their Pokemon and add them to their cart, leave feedback
 * on Pokemon in the form of comments, and submit a contact
 * form. 
 */

(function() {
    "use strict";

    // API information.
    const API_BASE_URL = "http://localhost:8000/"
    // PokeAPI information for Pokemon moves.
    const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2/pokemon/"
    // Pokemon on each shop page.
    const POKEMON_PER_PAGE = 9;
    // Maximum Pokemon that can be added to the cart.
    const POKEMON_CART_MAX = 6;
    // Maximum moves that a Pokemon can have.
    const POKEMON_MAX_MOVES = 4;
    // Dream world version image base url for Pokemon images (uses .svg)
    const DREAM_IMG_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/"
    // Standard image base url for Pokemon images (uses .png)
    const STANDARD_IMG_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/"
    // Base URL for the shiny version of a Pokemon (uses .png)
    const SHINY_IMG_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/"
    // All Pokemon types.
    const TYPES = ["normal", "fire", "water", "electric", "grass", "ice", 
                   "fighting", "poison", "ground", "flying", "psychic",
                   "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
    // Pokemon ID limit on image differentiation.
    const POKE_IMG_LIMIT = 650;

    // Current shop page.
    let curPage = 0;
    // All Pokemon's JSON information.
    let allPokemon;
    // Pokemon in the cart
    let pokemonInCart = [];
    // Pokemon currently on the product page.
    let pokemonProduct;

    /**
     * Sets up the Pokeshop buttons, fetches all Pokemon from
     * the API, generates the search, and generates
     * the recommended team for the user.
     * @returns none
     */
    async function init() {
        initializeButtons();
        genRefineSearch();
        setUpSearch();
        generatePokemonShop();
        genRecommendationTeams();
        qs("#clear-search").addEventListener("click", function () {
            qs("#search-input").value = null;
            generatePokemonShop();
        });
    }

    /**
     * Sets up the event handlers for the Pokeshop buttons.
     * @returns none
     */
    function initializeButtons() {
        qs("#prev-btn").addEventListener("click", prevPage);
        qs("#prev-btn").disabled = true;
        qs("#next-btn").addEventListener("click", nextPage);
        qs("#product-back-btn").addEventListener("click", toggleViews);
        qs("#cart-add-btn").addEventListener("click", addPokemonToCart);
        qs("#comment-btn").addEventListener("click", submitReview);
        qs("header h1").addEventListener("click", returnToShop);
        qs("#contact-form").addEventListener("submit", function(event) {
            event.preventDefault();
            submitContact();
        });
        qs("#contact-header img").addEventListener("click", function() {
            qs("#contact-response").classList.add("hidden");
            qs("#contact-view").classList.add("hidden");
        });
        qs("#contact").addEventListener("click", function() {
            qs("#contact-view").classList.remove("hidden");
        })
        qs("#cart").addEventListener("click", openCart);
        qs("#cart-header img").addEventListener("click", closeCart);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Pokemon Shop Page                              */
    /* -------------------------------------------------------------------------- */

    /* ------------------------------ Shop Generation Functions ------------------------------ */  

    /**
     * Generates the Pokemon Shop listings.
     * @returns none.
     */
    async function generatePokemonShop() {
        curPage = 0;
        clearDivider(qs("#all-pokemon"));
        allPokemon = await getAllPokemon();
        qs("#prev-btn").disabled = true;
        if (allPokemon.length <= POKEMON_PER_PAGE) {
            qs("#next-btn").disabled = true;
        } else {
            qs("#next-btn").disabled = false;
        }
        await generatePokemonPage();
    }

    /**
     * Fetches all the Pokemon to be listed on the store.
     * @returns the Promise object containing all Pokemon info.
     */
    async function getAllPokemon() {
        let resp = await fetch(API_BASE_URL + "info" + genFilterQuery(), {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .catch(handleError);
       return resp;
    }

    /**
     * Fetches the information of the Pokemon specified.
     * @param {String} name - the name of the Pokemon
     * @returns the Promise object containing the Pokemon's info.
     */
    async function getPokemonInfo(name) {
        let resp = await fetch(API_BASE_URL + "info/" + name, {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .catch(handleError);
       return resp;
    }

    /* ------------------------------ Pokemon Showdown Functions ------------------------------ */  

    /**
     * Generates the recommended team section of the Pokemon Store page.
     * @returns none
     */
    async function genRecommendationTeams() {
        const recommendedTeamSection = qs("#recommended-team");
        clearDivider(recommendedTeamSection);
        let recommendedTeam = await getRecommendationTeams();
        for (let j = 0; j < recommendedTeam.length; j++) {
            let pokemonInfo = await getPokemonInfo(recommendedTeam[j]);
            recommendedTeamSection.appendChild(await genPokemonCard(pokemonInfo));
        }
    }

    /**
     * Fetches the Pokemon Showdown teams that contain the Pokemon currently
     * in the user's cart.
     * @returns an array of Promise objects containing the valid Pokemon Showdown teams.
     */
    async function getRecommendationTeams() {
        let resp = await fetch(API_BASE_URL + "teams" + genRecommendationQuery(), {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .then(data => data[0])
        .catch(handleError);
        return resp;
    }

    /* ------------------------------ Shop Page Navigation Functions ------------------------------ */  

    /**
     * Generates a page of Pokemon on the Pokemon store.
     * @returns none
     */
    async function generatePokemonPage() {
        for (let i = 0; i < Math.min(POKEMON_PER_PAGE, allPokemon.length); i++) {
            if (i + curPage * POKEMON_PER_PAGE >= allPokemon.length) {
                break;
            }
            let pokemonCard = await genPokemonCard(allPokemon[i + curPage * POKEMON_PER_PAGE]);
            qs("#all-pokemon").appendChild(pokemonCard);
        }
    }

    /**
     * Generates the next shop page based on the Pokemon shop.
     * @returns none
     */
    function nextPage() {
        clearDivider(qs("#all-pokemon"));
        const prevPageBtn = qs("#prev-btn");
        const nextPageBtn = qs("#next-btn");
        curPage += 1;
        const maxPage = Math.floor((allPokemon.length - 1) / POKEMON_PER_PAGE);
        if (curPage === maxPage) {
            nextPageBtn.disabled = true;
        }
        if (curPage > 0) {
            prevPageBtn.disabled = false;
        }
        generatePokemonPage();
    }

    /**
     * Generates the previous shop page on the Pokemon shop.
     * @returns none
     */
    function prevPage() {
        clearDivider(qs("#all-pokemon"));
        const nextPageBtn = qs("#next-btn");
        const prevPageBtn = qs("#prev-btn");
        curPage -= 1;
        const maxPage = Math.floor((allPokemon.length - 1) / POKEMON_PER_PAGE);
        if (curPage === 0) {
            prevPageBtn.disabled = true;
        } 
        if (curPage < maxPage) {
            nextPageBtn.disabled = false;
        }
        generatePokemonPage();
    }

    /* ------------------------------ Pokemon Card Generation Functions ------------------------------ */  

    /**
     * Takes info about an Pokemon and returns an article card
     * with relevant info (h3 and img).
     * @param {Object} pokemonInfo - an object describing the pokemon
     * @return {DOMElement} The element representing an pokemon's card. The format
     * of the returned article is the following:
     * 
     * <article class="card">
     *     <!-- Source: PokeAPI -->
     *    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png" alt="Charizard">
     *    <h2>Charizard</h2>
     *    <div class="poke-types">
     *       <p class="fire">Fire</p>
     *    </div>
     *    <button class="customize-btn">Add to Cart</button>
     * </article>
     */
    async function genPokemonCard(pokemonInfo) {
        const pokemonHeader = gen("h2");
        const pokemonName = pokemonInfo.name;
        pokemonHeader.textContent = capitalizeName(pokemonName.replace('-', ' '));
        const pokemonImage = await genPokemonImage(pokemonName, pokemonInfo.id, pokemonHeader);
        const pokemonTypeDiv = genPokemonTypeDiv(pokemonInfo)
        const customizeButton = genCustomizeButton(pokemonInfo);

        const pokemonShopCardInfo = gen("div");
        pokemonShopCardInfo.classList.add("card-info-div");
        pokemonShopCardInfo.appendChild(pokemonHeader);
        pokemonShopCardInfo.appendChild(pokemonTypeDiv);

        const pokemonShopCardDiv = gen("div");
        pokemonShopCardDiv.classList.add("card-div");
        pokemonShopCardDiv.appendChild(pokemonShopCardInfo);
        pokemonShopCardDiv.appendChild(pokemonImage);

        const pokemonArticle = gen("article");
        pokemonArticle.classList.add("card");
        pokemonArticle.classList.add(pokemonInfo.type1);
        pokemonArticle.appendChild(pokemonShopCardDiv);
        pokemonArticle.appendChild(customizeButton);
        return pokemonArticle;
    }

    /**
     * Generates a Pokemon's image, shiny or not, based on the Pokemon name.
     * @param {String} pokemonName - the name of the Pokemon
     * @param {String} pokemonID - the ID of the Pokemon
     * @param {String} pokemonHeader - formatted name of the Pokemon
     * @returns {DOMElement} - the image of the Pokemon
     */
    async function genPokemonImage(pokemonName, pokemonID, pokemonHeader) {
        const shiny = await getPokemonShiny(pokemonName);
        const pokemonImage = gen("img");
        if (shiny === "true") {
            pokemonImage.src = SHINY_IMG_URL + pokemonID + ".png";
        } else if (pokemonID < POKE_IMG_LIMIT) {
            pokemonImage.src = DREAM_IMG_URL + pokemonID + ".svg";
        } else {
            pokemonImage.src = STANDARD_IMG_URL + pokemonID + ".png";
        }
        pokemonImage.alt = pokemonHeader.textContent;
        return pokemonImage;
    }

    /**
     * Generates the Pokemon Type divider.
     * @param {JSON} pokemonInfo - the JSON object with the Pokemon's info
     * @returns {DOMElement} - the Pokemon's type divider
     */
    function genPokemonTypeDiv(pokemonInfo) {
        const pokemonTypeDiv = gen("div");
        pokemonTypeDiv.classList.add("poke-types");
        const pokemonType1 = pokemonInfo.type1;
        if (pokemonType1) {
            pokemonTypeDiv.appendChild(genPokemonType(pokemonType1))
        }
        const pokemonType2 = pokemonInfo.type2;
        if (pokemonType2 != "None") {
            pokemonTypeDiv.appendChild(genPokemonType(pokemonType2))
        }
        return pokemonTypeDiv;
    }

    /**
     * Generates a divider with the Pokemon's type name and symbol.
     * @param {String} typeName - the type of the Pokemon
     * @returns {DOMElement} - the divider with the Pokemon's type info
     */
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

    /**
     * Generates the Pokemon customize button.
     * @param {JSON} pokemonInfo - the JSON object with the Pokemon's info
     * @returns {DOMElement} - the Pokemon's customize button
     */
    function genCustomizeButton(pokemonInfo) {
        const customizeButton = gen("button");
        customizeButton.classList.add("customize-btn");
        customizeButton.textContent = "Customize";
        customizeButton.addEventListener("click", function () {
            navigiateToProduct(pokemonInfo);
        });
        return customizeButton;
    }

    /* ------------------------------ Refine Search Functions ------------------------------ */  

    /**
     * Generates all checkboxes for the Refine Search section.
     * @returns none
     */
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

    /**
     * Generates a checkbox for a Pokemon type.
     * @param {DOMElement} refineSearch - the divider of the Refine Search
     * @param {DOMElement} type - the Pokemon type of the checkbox
     * @returns none
     */
    function generateTypeCheckbox(refineSearch, type) {
        const searchDiv = gen("div");
        searchDiv.classList.add("search-div");
        const searchInput = gen("input");
        searchInput.type = "checkbox";
        searchInput.id = type + "-check";
        searchInput.name = type;
        searchInput.checked = "checked";
        searchInput.addEventListener("change", function () {
            generatePokemonShop();
        })
        const searchLabel = gen("label");
        searchLabel.textContent = capitalizeName(type);
        searchDiv.appendChild(searchInput);
        searchDiv.appendChild(searchLabel);
        refineSearch.appendChild(searchDiv);
    }

    /**
     * Generates the Pokemon recommendation algorithm checkbox.
     * @param {JSON} pokemonInfo - the JSON object with the Pokemon's info
     * @returns none
     */
    function generateRecCheckbox(refineSearch) {
        const recDiv = gen("div");
        recDiv.classList.add("recommendation");
        const recInput = gen("input");
        recInput.type = "checkbox";
        recInput.id =  "rec-check";
        recInput.name = "recommendation toggle";
        recInput.checked = "checked";
        recInput.addEventListener("change", function () {
            qs("#recommended-team").classList.toggle("hidden");
        });
        const recLabel = gen("label");
        recLabel.textContent = "Recommendations"
        recDiv.appendChild(recInput);
        recDiv.appendChild(recLabel);
        refineSearch.appendChild(recDiv);
    }

    /**
     * Adds the search bar and clear search to the PokeShop.
     * @returns none
     */
    function setUpSearch() {
        const searchBar = qs("#search-input");
        searchBar.addEventListener("change", () => {
            if (searchBar.value) {
                generatePokemonShop();
            }
        });
        const pokeSearch = qs("#all-pokemon-header > img");
        pokeSearch.addEventListener("click", function () {
            if (searchBar.value) {
                generatePokemonShop();
            }
        })
    }

    /* -------------------------------------------------------------------------- */
    /*                           Pokemon Product Pages                            */
    /* -------------------------------------------------------------------------- */
    
    /* ------------------------ Pokemon Product Generation --------------------------- */  

    /**
     * Generates the Product page for the specified Pokemon.
     * @param {JSON} pokemonInfo - the JSON object with the Pokemon's info
     * @returns none
     */
    async function genPokemonProduct(pokemonInfo) {
        qs("title").textContent = capitalizeName(pokemonInfo.name);
        clearPokemonProductPage();
        await genPokemonInfoLeft(pokemonInfo);
        genPokemonInfoRight(pokemonInfo);
        const pokemonMoves = await getPokemonMoves(pokemonInfo.id);
        genPokemonMoves(pokemonMoves);
        genPokemonComments(pokemonInfo.name);
        qs("#poke-info").classList.add(pokemonInfo.type1);
        qs("#shiny-btn").addEventListener("click", toggleShinyImage);
    }   

    /**
     * Generates the left half of the Pokemon's Product page information.
     * @param {JSON} pokemonInfo - the JSON object with the Pokemon's info
     * @returns none
     */
    async function genPokemonInfoLeft(pokemonInfo) {
        const frame = qs("#frame");
        const header = gen("h2");
        header.textContent = capitalizeName(pokemonInfo.name);
        const img = await genPokemonImage(pokemonInfo.name, pokemonInfo.id, header);
        frame.appendChild(header);
        frame.appendChild(img);
    }
    
    /**
     * Generates the right half of the Pokemon's Product page information.
     * @param {JSON} pokemonInfo - the JSON object with the Pokemon's info
     * @returns none
     */
    function genPokemonInfoRight(pokemonInfo) {
        genPokemonProductTypes(pokemonInfo);
        genPokemonProductStats(pokemonInfo);
        genPokemonProductBStats(pokemonInfo);
    }
    
    /**
     * Generates the the types for the Pokemon on its product page.
     * @param {JSON} pokemonInfo - the JSON object with the Pokemon's info
     * @returns none
     */
    function genPokemonProductTypes(pokemonInfo) {
        const types = qs("#poke-types");
        const typesHeader = gen("h2");
        typesHeader.textContent = "Types";
        types.appendChild(typesHeader);
        const pokemonType1 = pokemonInfo.type1;
        if (pokemonType1) {
            types.appendChild(genPokemonType(pokemonType1))
        }
        const pokemonType2 = pokemonInfo.type2;
        if (pokemonType2 != "None") {
            types.appendChild(genPokemonType(pokemonType2))
        }
    }
    
    /**
     * Generates the the stats for the Pokemon on its product page.
     * @param {JSON} pokemonInfo - the JSON object with the Pokemon's info
     * @returns none
     */
    function genPokemonProductStats(pokemonInfo) {
        qs("#pokedex-id").textContent = pokemonInfo.id;
        qs("#height").textContent = pokemonInfo.height;
        qs("#weight").textContent = pokemonInfo.weight;
    }
    
    /**
     * Generates the the battle stats for the Pokemon on its product page.
     * @param {JSON} pokemonInfo - the JSON object with the Pokemon's info
     * @returns none
     */
    function genPokemonProductBStats(pokemonInfo) {
        qs("#hp").textContent = pokemonInfo.hp;
        qs("#atk").textContent = pokemonInfo.atk;
        qs("#def").textContent = pokemonInfo.def;
        qs("#sp-atk").textContent = pokemonInfo.spatk;
        qs("#sp-def").textContent = pokemonInfo.spdef;
        qs("#speed").textContent = pokemonInfo.speed;
    }

    /**
     * Fetches all the moves of a Pokemon of a specified ID.
     * @param {String} id - the Pokemon's ID
     * @returns an array of Promise objects containing all Pokemon info.
     */
    async function getPokemonMoves(id) {
        let resp = await fetch(POKEAPI_BASE_URL + id, {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .then(data => data.moves)
        .catch(handleError);
       return resp;
    }
    
    /**
     * Generates the the moves for the Pokemon on its product page.
     * @param {Array} pokemonMoves - the array containing the Pokemon's moves
     * @returns none
     */
    function genPokemonMoves(pokemonMoves) {
        const moves = qs("#moves");
        const movesHeader = gen("h2");
        movesHeader.textContent = "Moves";
        moves.appendChild(movesHeader);
        for (let i = 0; i < pokemonMoves.length; i++) {
            const newMove = gen("button");
            newMove.textContent = capitalizeName(pokemonMoves[i].move.name);
            newMove.addEventListener("click", function () {
                if (qsa(".move-selected").length < POKEMON_MAX_MOVES 
                    || this.classList.contains("move-selected")) {
                    this.classList.toggle("move-selected");
                }
            });
            moves.appendChild(newMove);
        }
    }

    /**
     * Clears the Pokemon product page.
     * @returns none
     */
    function clearPokemonProductPage() {
        clearDivider(qs("#frame"));
        clearDivider(qs("#poke-types"));
        clearDivider(qs("#moves"));
        clearComments();
    }
    
    /* -------------------- Product Page Commenting ---------------------------- */  

    /**
     * Fetches all the comments for the Pokemon to be listed on 
     * the product page.
     * @param {String} name - the Pokemon's name 
     * @returns a Promise objects containing the comments about the Pokemon.
     */
    async function getPokemonComments(name) {
        let resp = await fetch(API_BASE_URL + "comments/" + name, {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.json())
        .catch(handleError);
       return resp;
    }

    /**
     * Leaves a review for the Pokemon on its product page.
     * @param {String} name - the Pokemon's name 
     * @param {String} review - the review for the Pokemon
     */
    async function postPokemonReview(name, review) {
        let resp = await fetch(API_BASE_URL + "review/" + name, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                'review': review
            })
        })
        .then(checkStatus)
        .then(response => response.text())
        .catch(handleError);
       return resp;
    }

    /**
     * Generates the comments of the Pokemon product page.
     * @param {String} name - the Pokemon's name
     * @returns none
     */
    async function genPokemonComments(name) {
        const comments = qs("#comments");
        const userComments = await getPokemonComments(name);
        for (let i = 0; i < userComments.length; i++) {
            let postedComment = gen("p");
            postedComment.textContent = userComments[i].id + ": " + userComments[i].comment;
            postedComment.classList.add("comment");
            comments.appendChild(postedComment);
            let divider = gen("hr");
            comments.appendChild(divider);
        }
    }

    /**
     * Submits a review to the Pokemon product's page.
     * @returns none
     */
    async function submitReview() {
        const review = qs("#comment-msg").value;
        await postPokemonReview(pokemonProduct.name, review);
        clearComments();
        genPokemonComments(pokemonProduct.name);
    }

    /**
     * Clears the comments on the Pokemon product page.
     * @returns none
     */
    function clearComments() {
        const allComments = qsa(".comment");
        const dividers = qsa("#comments hr");
        for (let i = 0; i < allComments.length; i++) {
            allComments[i].remove();
            dividers[i].remove();
        }
    }
    
    /* ------------------------ Shiny Pokemon Functions --------------------------- */  

    /**
     * Fetches whether the Pokemon on the store is shiny or not.
     * @param {String} pokemonName - the Pokemon's name
     * @returns Promise string containing the shiny value of 
     * the Pokemon ("true"/"false").
     */
    async function getPokemonShiny(pokemonName) {
        let resp = await fetch(API_BASE_URL + "shiny/" + pokemonName, {
            method: "GET"
        })
        .then(checkStatus)
        .then(response => response.text())
        .catch(handleError);
       return resp;
    }

    /**
     * Updates whether the Pokemon is shown as shiny or not.
     * @param {String} name - the Pokemon's name
     * @returns the Promise object containing the shiny value for the Pokemon.
     */
    async function updateShiny(name) {
        let resp = await fetch(API_BASE_URL + "update/" + name, {
            method: "POST",
        })
        .then(checkStatus)
        .then(response => response.text())
        .catch(handleError);
       return resp;
    }

    /**
     * Toggles the Pokemon's image to its shiny version.
     * @returns none
     */
    async function toggleShinyImage() {
        const shiny = await updateShiny(pokemonProduct.name);
        const pokemonImage = qs("#frame img");
        if (shiny === "true") {
            pokemonImage.src = SHINY_IMG_URL + pokemonProduct.id + ".png";
        } else if (pokemonProduct.id < POKE_IMG_LIMIT) {
            pokemonImage.src = DREAM_IMG_URL + pokemonProduct.id + ".svg";
        } else {
            pokemonImage.src = STANDARD_IMG_URL + pokemonProduct.id + ".png";
        }
    }

    /* -------------------- Product Page View Toggling ---------------------------- */  

    /**
     * Returns to the shop page.
     * @returns none
     */
    async function returnToShop() {
        await generatePokemonShop();
        qs("#store").classList.remove("hidden");
        qs("#pokemon-product").classList.add("hidden");
        qs("title").textContent = "Pokemon Store Page";
        qs("#cart-view").classList.add("hidden");
        pokemonProduct = null;
    }

    /**
     * Toggles between shop view and the product page.
     * @returns none
     */
    function toggleViews() {
        qs("#store").classList.remove("hidden");
        qs("#pokemon-product").classList.add("hidden");
        qs("title").textContent = "Pokemon Store Page";
        qs("#poke-info").classList.remove(pokemonProduct.type1);
        qs("#added-to-cart").classList.add("hidden");
        qs("#cart-view").classList.add("hidden");
        pokemonProduct = null;
    }

    /**
     * Switches view from store page to Pokemon Product Page
     * @param {Object} pokemonInfo - an object describing the pokemon
     * @return none
     */
    function navigiateToProduct(pokemonInfo) {
        qs("#store").classList.add("hidden");
        qs("#pokemon-product").classList.remove("hidden");
        qs("#cart-view").classList.add("hidden");
        qs("#poke-info").className = "";
        qs("#added-to-cart").classList.add("hidden");
        pokemonProduct = pokemonInfo;
        genPokemonProduct(pokemonInfo);
    }

    /* -------------------------------------------------------------------------- */
    /*                           Pokemon Cart Page                                */
    /* -------------------------------------------------------------------------- */

    /**
     * Adds a Pokemon with the specified moves to the cart.
     * @returns none
     */
    function addPokemonToCart() {
        if (pokemonInCart.length < POKEMON_CART_MAX) {
            const pokemonCartObject = {
                'name': capitalizeName(pokemonProduct.name),
                'moves': qsa(".move-selected"),
                'info': pokemonProduct
            };
            pokemonInCart.push(pokemonCartObject);
        }
        genRecommendationTeams();
        qs("#added-to-cart").classList.remove("hidden");
    }

    /**
     * Generates the Pokemon Cart card and adds it to the cart's pokemon.
     * @param {Object} pokemonCartObject - the object containing the 
     * Pokemon's information and moves.
     * @returns none
     */
    async function genPokemonCartCard(pokemonCartObject) {
        const pokemonInfo = pokemonCartObject.info;

        const pokemonHeader = gen("h2");
        const pokemonName = pokemonInfo.name;
        pokemonHeader.textContent = capitalizeName(pokemonName.replace('-', ' '));
        const pokemonImage = await genPokemonImage(pokemonName, pokemonInfo.id, pokemonHeader);
        const pokemonTypeDiv = genPokemonTypeDiv(pokemonInfo);

        const pokemonCardInfo = gen("div");
        pokemonCardInfo.classList.add("card-info-div");
        pokemonCardInfo.appendChild(pokemonHeader);
        pokemonCardInfo.appendChild(pokemonTypeDiv);

        const pokemonCardDiv = gen("div");
        pokemonCardDiv.classList.add("card-div");
        pokemonCardDiv.appendChild(pokemonCardInfo);
        pokemonCardDiv.appendChild(pokemonImage);

        const pokemonArticle = gen("article");
        pokemonArticle.classList.add("card");
        pokemonArticle.classList.add(pokemonInfo.type1);
        pokemonArticle.appendChild(pokemonCardDiv);

        const pokemonMoves = genCartMoves(pokemonCartObject.moves);
        pokemonArticle.appendChild(pokemonMoves);
        const removePokemon = gen("button");
        const divider = gen("hr");
        pokemonArticle.appendChild(divider);
        removePokemon.id = "cart-remove-btn";
        removePokemon.textContent = "Remove Pokemon";
        pokemonArticle.appendChild(removePokemon);
        removePokemon.addEventListener("click", function () {
            const cartIndex = pokemonInCart.indexOf(pokemonCartObject);
            pokemonInCart.splice(cartIndex, 1);
            pokemonArticle.remove();
        });
        qs("#cart-pokemon").appendChild(pokemonArticle);
    }

    /**
     * Generates the moves divider for the Pokemon Cart card.
     * @param {Array} pokemonMoves - the moves of the Pokemon selected by the user.
     * @returns {DOMElement} - the moves divider element
     */
    function genCartMoves(pokemonMoves) {
        const moves = gen("div")
        const movesHeader = gen("h2");
        movesHeader.textContent = "Moves";
        moves.appendChild(movesHeader);
        for (let i = 0; i < pokemonMoves.length; i++) {
            const newMove = gen("button");
            newMove.textContent = pokemonMoves[i].textContent;
            moves.appendChild(newMove);
        }
        return moves;
    }

    /**
     * Opens the cart view with the Pokemon that the user has purchased.
     * @returns none
     */
    async function openCart() {
        qs("#pokemon-product").classList.add("hidden");
        qs("#cart-view").classList.remove("hidden");
        qs("#store").classList.add("hidden");
        clearDivider(qs("#cart-pokemon"));
        for (let i = 0; i < pokemonInCart.length; i++) {
            await genPokemonCartCard(pokemonInCart[i]);
        }
    }

    /**
     * Closes the cart view and returns to the Pokemon store.
     * @returns none
     */
    function closeCart() {
        qs("#cart-view").classList.add("hidden");
        qs("#pokemon-product").classList.add("hidden");
        qs("#store").classList.remove("hidden");
    }

    /* -------------------------------------------------------------------------- */
    /*                           Pokemon Contact Page                             */
    /* -------------------------------------------------------------------------- */

     /**
     * Leaves a contact message for the Pokemon store page.
     * @returns none
     */
     async function postPokemonContact() {
        const params = new FormData(qs("#contact-form"));
        let resp = await fetch(API_BASE_URL + "contact", {
            method: "POST",
            body: params
        })
        .then(checkStatus)
        .then(response => response.text())
        .catch(handleError);
       return resp;
    }

    /**
     * Submits contact message to the Pokemon store.
     * @returns none
     */
    async function submitContact() {
        const resp = await postPokemonContact();
        qs("#contact-response").textContent = resp;
        qs("#contact-response").classList.remove("hidden");
    }


    /* -------------------------------------------------------------------------- */
    /*                           Helper Functions                                 */
    /* -------------------------------------------------------------------------- */

    /* ------------------------ General Helper Functions --------------------------- */  

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
            capitalName += splitName[i][0].toUpperCase() 
            + splitName[i].substring(1, splitName[i].length) + " ";
        }
        return capitalName.substring(0, capitalName.length - 1);
    }

    /* ------------------------------ Query Helper Functions ------------------------------ */  

    /**
     * Generates the query part of the URL for fetching the Pokemon on
     * the shop listings section.
     * @returns {String} - the query for filtering the Pokemon listings.
     */
    function genFilterQuery() {
        let queryURL = "";
        let firstQuery = true;
        const searchValue = qs("#search-input").value;
        if (searchValue && searchValue.length > 0) {
            [queryURL, firstQuery] = queryURLBuilder("search", searchValue, 
                                     queryURL, firstQuery);
        }
        for (let i = 0; i < TYPES.length; i++) {
            let queryValue = "true";
            if (!qs("#" + TYPES[i] + "-check").checked) {
                queryValue = "false";
            }
            [queryURL, firstQuery] = queryURLBuilder(TYPES[i], queryValue, 
                                                     queryURL, firstQuery);
        }
        return queryURL;
    }

    /**
     * Constructs the part of the URL containing the query for retrieving the 
     * Pokemon Showdown team recommendation.
     * @returns {String} - the part of the URL containing the query
     */
    function genRecommendationQuery() {
        const queryNames = ["p1", "p2", "p3", "p4", "p5", "p6"];
        let queryURL = "";
        let firstQuery = true;
        for (let i = 0; i < pokemonInCart.length; i++) {
            [queryURL, firstQuery] = queryURLBuilder(queryNames[i], pokemonInCart[i]['name'].toLowerCase(), 
                                                     queryURL, firstQuery);
        }
        return queryURL;
    }

    /**
     * Generates the query part of the URL based upon the querying input rules.
     * @param {String} queryText - query name
     * @param {String} query - query value
     * @param {String} queryURL - query URL (ex: "?year=1999&genre=sports")
     * @param {Boolean} firstQuery - if the query is the first thus far in the URL
     * @returns {Array} - the updated queryURL and firstQuery value
     */
    function queryURLBuilder(queryText, query, queryURL, firstQuery) {
        if (query) {
            if (firstQuery) {
                queryURL += "?"
                firstQuery = false;
            } else {
                queryURL += "&"
            }
            queryURL += queryText + "=" + query;
        }
        return [queryURL, firstQuery];
    }
    
    /* -------------------- Custom Error-handling -------------------- */  

    /**
     * Displays an error message on the page, hiding any previous results.
     * @param {String} errMsg - optional specific error message to display on page.
     */
     function handleError(errMsg) {
        if (typeof errMsg === "string") {
            qs("#message-area").textContent = errMsg;
        } else {
            /* The err object was passed, don't want to show it on the page;
               instead use generic error message. */
            qs("#message-area").textContent =
                "An error ocurred fetching the Pokemon data. Please try again later.";
        }
        qs("#message-area").classList.remove("hidden");
    }

    init();
})();
