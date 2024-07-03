import os
import json
import pandas as pd
from datetime import datetime, timedelta

directory = os.fsencode('data/wtt_matches')

TMP_ID = 0

def parse_match(m: dict, matches: list, sets: list):
    doc = m['documentCode']

    isTeam = False
    gscores = m['gameScores'] or m['resultsGameScores']
    if not gscores:
        isTeam = True
    else:
        if not any(
            int(score) >= 11
            for gscore in gscores.split(',')
            for score in gscore.split('-')
        ):
            isTeam = True

    # process player data
    a_id = b_id = x_id = y_id = None
    comp = m['competitiors'][0]
    a_id = comp['players'][0]['playerId']

    if int(a_id) > 100000000 or int(a_id) < 100000:
        isTeam = True

    if isTeam:
        # this is a team match, handle diff
        if not m['teamParentData']:
            return
        if 'matches' not in m['teamParentData']['extended_info']:
            return

        for _m in m['teamParentData']['extended_info']['matches']:
            if not _m.get('match_result'):
                continue
            mm = _m['match_result']
            parse_match(mm, matches, sets)

        return

    # continue if not a team match
    if len(comp['players']) > 1:
        b_id = comp['players'][1]['playerId']

    comp = m['competitiors'][1]
    x_id = comp['players'][0]['playerId']
    if len(comp['players']) > 1:
        y_id = comp['players'][1]['playerId']

    # process date and time data
    startDate = m['matchDateTime']['startDateUTC'] or m['matchDateTime']['startDateLocal']
    dt = datetime.strptime(startDate, '%m/%d/%Y %H:%M:%S')

    if m['matchDateTime']['duration']:
        parsed = False
        for fmt in {'%H:%M:%S', '%H:%M', ':%M'}:
            try:
                durdt = datetime.strptime(m['matchDateTime']['duration'], fmt)
            except Exception as e:
                pass
            else:
                parsed = True
                break

        if not parsed:
            print(m)

        dur = timedelta(hours=durdt.hour, minutes=durdt.minute, seconds=durdt.second).total_seconds()
    else:
        dur = 20 * 60 # choose some random average-ish number, 20 mins

    # process score data
    mscore = m['resultOverallScores'] or m['overallScores']
    if m['resultOverallScores'] and ',' in m['resultOverallScores']:
        mscore = m['overallScores']

    # don't count withdrawals
    if 'WO' in mscore:
        return
    res = mscore.split('-')

    evt = int(m['eventId'])

    row = {
        'event_id': evt,
        'doc': doc,
        'fmt': doc[4],
        'gender': doc[3],
        'stage': doc[22:26].rstrip('-'),
        'stage_id': doc[26:34].rstrip('-'),
        'duration': int(dur),
        'start': dt,
        'a_id': a_id,
        'b_id': b_id,
        'x_id': x_id,
        'y_id': y_id,
        'res_a': int(res[0]),
        'res_x': int(res[1]),
    }

    for i, score in enumerate(gscores.split(',')):
        if '-' not in score:
            print(m['eventId'])
            print(m['gameScores'], ' $ ', m['resultsGameScores'])
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


def parse_tournament(match_data: list[dict], players: dict):
    matches = []
    sets = []

    for m in match_data:
        parse_match(m, matches, sets)

    return matches, sets

def parse_event(evt, players):
    path = os.path.join(f'data/wtt_matches/{evt}.json') 
    with open(path, 'r') as f:
        matches = json.load(f)

    matches, sets = parse_tournament(matches, players)

    mf = pd.DataFrame(matches)
    if not mf.empty:
        mf.to_csv(f'data/wtt_cleaned/matches/{evt}.tsv', sep='\t', index=False)

    sf = pd.DataFrame(sets)
    if not sf.empty:
        sf.to_csv(f'data/wtt_cleaned/sets/{evt}.tsv', sep='\t', index=False)

for file in os.listdir(directory):
    filename = os.fsdecode(file)
    if not filename.endswith(".json"):
        continue

    if os.path.isfile('data/wtt_cleaned/players.tsv'):
        players = pd.read_csv('data/wtt_cleaned/players.tsv', sep='\t', index_col=[0]).to_dict('index')

    parse_event(filename[:-5], players)
