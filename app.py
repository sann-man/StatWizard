from flask import Flask, jsonify
from flask_cors import CORS
from nba_api.stats.endpoints import scoreboardv2, leaguegamelog, leaguegamefinder, boxscoretraditionalv2, playerindex
import pandas as pd
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

nba_team_colors = {
    "Boston Celtics": {"primary": "#007A33", "secondary": "#BA9653", "tertiary": "#FFFFFF"},
    "Brooklyn Nets": {"primary": "#080808", "secondary": "#FFFFFF", "tertiary": "#3D3D3D"},
    "New York Knicks": {"primary": "#006BB6", "secondary": "#F58426", "tertiary": "#BEC0C2"},
    "Philadelphia 76ers": {"primary": "#006BB6", "secondary": "#ED174C", "tertiary": "#FFFFFF"},
    "Toronto Raptors": {"primary": "#CE1141", "secondary": "#000000", "tertiary": "#A1A1A4"},
    "Chicago Bulls": {"primary": "#CE1141", "secondary": "#000000", "tertiary": "#FFFFFF"},
    "Cleveland Cavaliers": {"primary": "#6F263D", "secondary": "#FFB81C", "tertiary": "#041E42"},
    "Detroit Pistons": {"primary": "#C8102E", "secondary": "#1D42BA", "tertiary": "#BEC0C2"},
    "Indiana Pacers": {"primary": "#002D62", "secondary": "#FDBB30", "tertiary": "#BEC0C2"},
    "Milwaukee Bucks": {"primary": "#00471B", "secondary": "#EEE1C6", "tertiary": "#0077C0"},
    "Atlanta Hawks": {"primary": "#E03A3E", "secondary": "#C1D32F", "tertiary": "#26282A"},
    "Charlotte Hornets": {"primary": "#1D1160", "secondary": "#00788C", "tertiary": "#A1A1A4"},
    "Miami Heat": {"primary": "#98002E", "secondary": "#F9A01B", "tertiary": "#000000"},
    "Orlando Magic": {"primary": "#0077C0", "secondary": "#C4CED4", "tertiary": "#000000"},
    "Washington Wizards": {"primary": "#002B5C", "secondary": "#E31837", "tertiary": "#C4CED4"},
    "Denver Nuggets": {"primary": "#0E2240", "secondary": "#FEC524", "tertiary": "#8B2131"},
    "Minnesota Timberwolves": {"primary": "#0C2340", "secondary": "#236192", "tertiary": "#9EA2A2"},
    "Oklahoma City Thunder": {"primary": "#007AC1", "secondary": "#EF3B24", "tertiary": "#002D62"},
    "Portland Trail Blazers": {"primary": "#E03A3E", "secondary": "#000000", "tertiary": "#FFFFFF"},
    "Utah Jazz": {"primary": "#002B5C", "secondary": "#F9A01B", "tertiary": "#00471B"},
    "Golden State Warriors": {"primary": "#1D428A", "secondary": "#FFC72C", "tertiary": "#26282A"},
    "Los Angeles Clippers": {"primary": "#C8102E", "secondary": "#1D428A", "tertiary": "#BEC0C2"},
    "Los Angeles Lakers": {"primary": "#552583", "secondary": "#FDB927", "tertiary": "#000000"},
    "Phoenix Suns": {"primary": "#1D1160", "secondary": "#E56020", "tertiary": "#000000"},
    "Sacramento Kings": {"primary": "#5A2D81", "secondary": "#63727A", "tertiary": "#000000"},
    "Dallas Mavericks": {"primary": "#0053BC", "secondary": "#00285E", "tertiary": "#C4CED4"},
    "Houston Rockets": {"primary": "#CE1141", "secondary": "#C4CED4", "tertiary": "#000000"},
    "Memphis Grizzlies": {"primary": "#12173F", "secondary": "#5D76A9", "tertiary": "#707271"},
    "New Orleans Pelicans": {"primary": "#0C2340", "secondary": "#C8102E", "tertiary": "#85714D"},
    "San Antonio Spurs": {"primary": "#C4CED4", "secondary": "#000000", "tertiary": "#BAC3C9"}
}

team_id_to_name = {
    1610612738: "Boston Celtics",
    1610612751: "Brooklyn Nets",
    1610612752: "New York Knicks",
    1610612755: "Philadelphia 76ers",
    1610612761: "Toronto Raptors",
    1610612741: "Chicago Bulls",
    1610612739: "Cleveland Cavaliers",
    1610612765: "Detroit Pistons",
    1610612754: "Indiana Pacers",
    1610612749: "Milwaukee Bucks",
    1610612737: "Atlanta Hawks",
    1610612766: "Charlotte Hornets",
    1610612748: "Miami Heat",
    1610612753: "Orlando Magic",
    1610612764: "Washington Wizards",
    1610612743: "Denver Nuggets",
    1610612750: "Minnesota Timberwolves",
    1610612760: "Oklahoma City Thunder",
    1610612757: "Portland Trail Blazers",
    1610612762: "Utah Jazz",
    1610612744: "Golden State Warriors",
    1610612746: "Los Angeles Clippers",
    1610612747: "Los Angeles Lakers",
    1610612756: "Phoenix Suns",
    1610612758: "Sacramento Kings",
    1610612742: "Dallas Mavericks",
    1610612745: "Houston Rockets",
    1610612763: "Memphis Grizzlies",
    1610612740: "New Orleans Pelicans",
    1610612759: "San Antonio Spurs"
}

team_abbr_to_name = {
    "BOS": "Boston Celtics",
    "BKN": "Brooklyn Nets",
    "NYK": "New York Knicks",
    "PHI": "Philadelphia 76ers",
    "TOR": "Toronto Raptors",
    "CHI": "Chicago Bulls",
    "CLE": "Cleveland Cavaliers",
    "DET": "Detroit Pistons",
    "IND": "Indiana Pacers",
    "MIL": "Milwaukee Bucks",
    "ATL": "Atlanta Hawks",
    "CHA": "Charlotte Hornets",
    "MIA": "Miami Heat",
    "ORL": "Orlando Magic",
    "WAS": "Washington Wizards",
    "DEN": "Denver Nuggets",
    "MIN": "Minnesota Timberwolves",
    "OKC": "Oklahoma City Thunder",
    "POR": "Portland Trail Blazers",
    "UTA": "Utah Jazz",
    "GSW": "Golden State Warriors",
    "LAC": "Los Angeles Clippers",
    "LAL": "Los Angeles Lakers",
    "PHX": "Phoenix Suns",
    "SAC": "Sacramento Kings",
    "DAL": "Dallas Mavericks",
    "HOU": "Houston Rockets",
    "MEM": "Memphis Grizzlies",
    "NOP": "New Orleans Pelicans",
    "SAS": "San Antonio Spurs"
}

def get_recent_games():
    games = leaguegamelog.LeagueGameLog(season='2024-25')
    game_data = games.get_data_frames()[0]
    recent_games = game_data.tail(10)
    recent_games = recent_games.drop_duplicates(subset=['GAME_ID'])
    recent_game_ids = recent_games['GAME_ID'].tolist()
    return recent_game_ids, game_data

def format_matchup(matchup):
    parts = matchup.split(" ")
    team1_abbr = parts[0]
    team2_abbr = parts[2]
    if parts[1] == "@":
        return f"{team2_abbr} VS {team1_abbr}"
    else:
        return f"{team1_abbr} VS {team2_abbr}"

def get_team_logos(formatted_matchup):
    team1_abbr, team2_abbr = formatted_matchup.split(" VS ")
    team1_name = team_abbr_to_name[team1_abbr]
    team2_name = team_abbr_to_name[team2_abbr]
    team1_id = next(key for key, value in team_id_to_name.items() if value == team1_name)
    team2_id = next(key for key, value in team_id_to_name.items() if value == team2_name)
    team1_logo = f"https://cdn.nba.com/logos/nba/{team1_id}/primary/L/logo.svg"
    team2_logo = f"https://cdn.nba.com/logos/nba/{team2_id}/primary/L/logo.svg"
    return team1_logo, team2_logo

def get_team_points(game_id):
    team_stats = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id).get_data_frames()[1]
    team_points = {}
    for _, row in team_stats.iterrows():
        team_name = row['TEAM_NAME']
        points = row['PTS']
        team_points[team_name] = points
    return team_points

def get_player_info():
    recent_game_ids, game_data = get_recent_games()
    game_id = recent_game_ids[random.randint(0, len(recent_game_ids) - 1)]
    
    player_info = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id).get_data_frames()[0]
    player_index = playerindex.PlayerIndex().get_data_frames()[0]

    used_players = {}
    game_data_filtered = game_data[game_data['GAME_ID'] == game_id]
    matchup = game_data_filtered[['MATCHUP']].values[0][0]
    formatted_matchup = format_matchup(matchup)
    game_date = game_data_filtered[['GAME_DATE']].values[0][0]
    game_date = datetime.strptime(game_date, '%Y-%m-%d').strftime('%B %d, %Y')
    
    team1_logo, team2_logo = get_team_logos(formatted_matchup)
    team_points = get_team_points(game_id)
    
    for _, row in player_info.iterrows():
        player_id = int(row['PLAYER_ID'])
        player_name = row['PLAYER_NAME']
        stat_types = ['PTS', 'AST', 'REB', 'STL', 'BLK', 'TO']
        player_data = {stat: (row[stat] if pd.notnull(row[stat]) else 0) for stat in stat_types}
        player_img = f'https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png'

        # Retrieve jersey number and position
        jersey_number, position = None, None
        if not player_index[player_index['PERSON_ID'] == player_id].empty:
            player_row = player_index[player_index['PERSON_ID'] == player_id]
            jersey_number = player_row.get('JERSEY_NUMBER', player_row.get('JERSEY')).values[0]
            position = player_row.get('POSITION', player_row.get('POS')).values[0]

        team_id = row['TEAM_ID']
        team_name = team_id_to_name.get(team_id)
        team_logo = f'https://cdn.nba.com/logos/nba/{int(team_id)}/primary/L/logo.svg'
        used_team_colors = nba_team_colors.get(team_name, {"primary": "#000000", "secondary": "#FFFFFF", "tertiary": "#A1A1A4"})
        team_colors = [used_team_colors["primary"], used_team_colors["secondary"], used_team_colors["tertiary"]]

        # Only include players with significant statistics
        if all(value >= threshold for value, threshold in zip(player_data.values(), [6, 1, 3, 0, 0, 0])):
            used_players[str(player_id)] = {
                'player_name': player_name,
                'player_data': player_data,
                'team_logo': team_logo,
                'team1_logo': team1_logo,
                'team2_logo': team2_logo,
                'player_img': player_img,
                'team_name': team_name,
                'team_colors': team_colors,
                'jersey_number': jersey_number,
                'position': position,
                'matchup': formatted_matchup,
                'game_date': game_date,
                'team_points': team_points,
                'game_id': game_id
            }
            print(f"Player: {player_name}, Data: {player_data}")

    return used_players


@app.route('/')
def home():
    used_players = get_player_info()
    return jsonify({'usedPlayers': used_players})

if __name__ == '__main__':
    app.run(debug=True)