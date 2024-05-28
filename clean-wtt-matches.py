import os
import json
import pandas as pd
from datetime import datetime, timedelta

directory = os.fsencode('data/wtt_matches')

TMP_ID = 0

def parse_tournament(match_data: list[dict], players: dict):
    matches = []
    sets = []
    players_conflict = []

    def add_player(player_obj):
        tmp_id = None
        if not player_obj['playerId']:
            # this should be rare
            for k, v in players.items():
                if v['name'] == player_obj['playerName']:
                    tmp_id = k
        else:
            tmp_id = 

        if not tmp_id:
            TMP_ID += 1
            tmp_id = TMP_ID

        player_id = player_obj['playerId']

        player = players.get(player_id)
        if player:
            player_entry = {
                'tmp_id': tmp_id,
                'id': player_id,
                'org': player_obj['playerOrgCode'] or player['org'],
                'name': player_obj['playerName'] or player['name'],
            }
        else:
            player_entry = {
                'tmp_id': tmp_id,
                'id': player_id,
                'org': player_obj['playerOrgCode'],
                'name': player_obj['playerName'],
            }

        # check match existing
        if player_id in players and player_entry != players[player_id]:
            players_conflict.append(player_entry)
        else:
            players[player_id] = player_entry

        return player_entry

    for m in match_data:
        doc = m['documentCode']

        startDate = m['matchDateTime']['startDateUTC'] or m['matchDateTime']['startDateLocal']
        dt = datetime.strptime(startDate, '%m/%d/%Y %H:%M:%S')

        if m['matchDateTime']['duration']:
            durdt = datetime.strptime(m['matchDateTime']['duration'], '%H:%M:%S')
            dur = timedelta(hours=durdt.hour, minutes=durdt.minute, seconds=durdt.second).total_seconds()
        else:
            dur = 20 * 60 # choose some random average-ish number, 20 mins
 
        if ',' in m['resultOverallScores']:
            continue
        res = m['resultOverallScores'].split('-')
        evt = int(m['eventId'])

        a_id = b_id = x_id = y_id = None
        comp = m['competitiors'][0]
        a_id = add_player(comp['players'][0])['id']
        if len(comp['players']) > 1:
            b_id = add_player(comp['players'][1])['id']

        comp = m['competitiors'][1]
        x_id = add_player(comp['players'][0])['id']
        if len(comp['players']) > 1:
            y_id = add_player(comp['players'][1])['id']

        row = {
            'event_id': evt,
            'doc': doc,
            'fmt': doc[4],
            'gender': doc[3],
            'stage': doc[22:26].rstrip('-'),
            'stage_id': doc[26:32],
            'duration': int(dur),
            'start': dt,
            'a_id': a_id,
            'b_id': b_id,
            'x_id': x_id,
            'y_id': y_id,
            'res_a': int(res[0]),
            'res_x': int(res[1]),
        }

        for i, score in enumerate(m['resultsGameScores'].split(',')):
            score_a, score_x = score.split('-')
            score_a = int(score_a)
            score_x = int(score_x)
            if score_a + score_x == 0:
                continue

            sets.append({
                'event_id': evt,
                'doc': doc,
                'score_a': score_a,
                'score_x': score_x,
                'num': i + 1
            })

        matches.append(row)
    return matches, sets, players_conflict

def parse_event(evt, players):
    path = os.path.join(f'data/wtt_matches/{evt}.json') 
    with open(path, 'r') as f:
        matches = json.load(f)

    matches, sets, players_conflict = parse_tournament(matches, players)

    pd.DataFrame(matches).to_csv(f'data/wtt_cleaned/matches/{evt}.tsv', sep='\t', index=False)
    pd.DataFrame(sets).to_csv(f'data/wtt_cleaned/sets/{evt}.tsv', sep='\t', index=False)
    pd.DataFrame.from_dict(players, orient='index').to_csv('data/wtt_cleaned/players.tsv', sep='\t', index=False)
    pd.DataFrame(players_conflict).to_csv('data/wtt_cleaned/players_conflict.tsv', mode='a', sep='\t', index=False)

for file in os.listdir(directory):
    filename = os.fsdecode(file)
    if not filename.endswith(".json"):
        continue

    if os.path.isfile('data/wtt_cleaned/players.tsv'):
        players = pd.read_csv('data/wtt_cleaned/players.tsv', sep='\t', index_col=[0]).to_dict('index')
    else:
        players = {}

    parse_event(filename[:-5], players)
