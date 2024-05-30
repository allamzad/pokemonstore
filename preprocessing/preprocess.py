import itertools
import json

# All Pokemon Showdown teams.
teams = []
# Teams already in the teams array.
seen_teams = set()
# All valid pokkemon names.
all_pokemon = []

# Number of Pokemon in a team.
POKEMON_IN_TEAM = 6

# Save all pokemon from the all-pokemon.txt file into an array.
with open('data/all-pokemon.txt', 'r') as pokemon_file:
    all_pokemon_lines = pokemon_file.readlines()
    for line in all_pokemon_lines:
        all_pokemon.append(line.strip())

# Open the Pokemon Showdown data file and read its lines.
showdown_file = open("data/showdown-data.txt", "r", encoding="utf8")
all_lines = showdown_file.readlines()
 
# Scan through the Pokemon Showdown data and assemble teams.
count = 0
cur_team = []
for line in all_lines:
    stripped_line = line.strip()
    if "https://www.smogon.com/forums/threads" in stripped_line:
        if (len(cur_team) == POKEMON_IN_TEAM) and (str(cur_team) not in seen_teams):
            permutation_teams = list(itertools.permutations(cur_team))
            for permutation in permutation_teams:
                seen_teams.add(str(list(permutation)))
            seen_teams.add(str(cur_team))
            teams.append(cur_team)
            cur_team = []
        else:
            cur_team = []
    if '@' in stripped_line:
        for pokemon in all_pokemon:
            if pokemon.lower() in stripped_line.lower():
                cur_team.append(pokemon)
                break

# Write the Pokemon Showdown teams to a file.
with open("data/pokemon-teams.txt", "w") as teams_file:
    json.dump(teams, teams_file)
    # for team in teams:
    #     teams_file.write(team + "\n") 
