import itertools
import json
import pandas as pd
import csv
import random

# All Pokemon Showdown teams.
teams = []
# Teams already in the teams array.
seen_teams = set()
# All valid pokkemon names.
all_pokemon = []

# Number of Pokemon in a team.
POKEMON_IN_TEAM = 6

# Creates the pokemon-teams.txt file.
def preprocess_showdown_teams():
    # Save all pokemon from the all-pokemon.txt file into an array.
    with open('data/all-pokemon.txt', 'r') as pokemon_file:
        all_pokemon_lines = pokemon_file.readlines()
        for line in all_pokemon_lines:
            all_pokemon.append(line.strip())

    # Open the Pokemon Showdown data file and read its lines.
    showdown_file = open("data/showdown-data.txt", "r", encoding="utf8")
    all_lines = showdown_file.readlines()
    
    # Scan through the Pokemon Showdown data and assemble teams.
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

# Creates the comments/ .csv data files.
def create_comments():
    df = pd.read_csv('data/pokemon.csv')
    pokemon_names = df.name
    for name in pokemon_names:
        capitalName = capitalizeName(name)
        comments = [f'{capitalName} is an excellent support Pokemon!', 
                    f'{capitalName} is a versatile Pokemon, great in many teams.',
                    f'Do not recommend {capitalName} in most team compositions.',
                    f'{capitalName} is a great Pokemon for collecting, not so much in duels.',
                    f'Great in some teams, not so great in others.',
                    f'{capitalName}\'s performance depends heavily on its moveset.']
        with open(f'data/comments/{name}.csv', 'w', newline='',) as comment_file:
            header = ['id', 'comment']
            writer = csv.DictWriter(comment_file, fieldnames=header)
            writer.writeheader()
            num_random_comments = random.randint(0, 3)
            random_comments = list(itertools.combinations(comments, num_random_comments))
            random_comments_idx = random.randint(0, len(random_comments) - 1)
            csv_idx = 1
            for comment in random_comments[random_comments_idx]:
                comment_dict = {}
                comment_dict["id"] = csv_idx
                comment_dict["comment"] = comment.strip()
                writer.writerow(comment_dict)
                csv_idx += 1

# Creates the shiny.csv data file.
def create_shiny():
    df = pd.read_csv('data/pokemon.csv')
    pokemon_names = df.name
    with open(f'data/shiny.csv', 'w', newline='',) as shiny_file:
        header = ['name', 'shiny']
        writer = csv.DictWriter(shiny_file, fieldnames=header)
        writer.writeheader()
        for name in pokemon_names:
            shiny_dict = {}
            shiny_dict["name"] = name
            shiny_dict["shiny"] = "false"
            writer.writerow(shiny_dict)

# Capitalizes Pokemon names.
def capitalizeName(name):
    capitalName = ""
    splitName = name.split(" ")
    for i in range(len(splitName)):
        capitalName += splitName[i][0].upper() + splitName[i][1:len(splitName[i])] + " "
    return capitalName[0:len(capitalName) - 1]

create_shiny()
