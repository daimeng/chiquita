import os
import json
import pandas as pd
from datetime import datetime, timedelta

directory = os.fsencode('data/wtt_matches')

TMP_ID = 0

tf = pd.read_csv('data/tournaments_wtt.tsv', sep='\t', parse_dates=['StartDateTime', 'EndDateTime'])
tf.set_index('EventId', inplace=True)

def parse_match(m: dict, matches: list):
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
            parse_match(mm, matches)

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
    try:
        dt = datetime.strptime(startDate, '%m/%d/%Y %H:%M:%S')
    except Exception as e:
        evtid = int(m['eventId'])
        if evtid in tf.index:
            dt = tf.loc[evtid]['StartDateTime']
        else:
            print(json.dumps(m, indent=2))
            raise e

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
        'scores': gscores.replace(',0-0', ''),
    }

    # for i, score in enumerate(gscores.split(',')):
    #     if '-' not in score:
    #         print(m['eventId'])
    #         print(m['gameScores'], ' $ ', m['resultsGameScores'])
    #     score_a, score_x = score.split('-')
    #     score_a = int(score_a)
    #     score_x = int(score_x)
    #     if score_a + score_x == 0:
    #         continue

    #     sets.append({
    #         'event_id': evt,
    #         'doc': doc,
    #         'score_a': score_a,
    #         'score_x': score_x,
    #         'num': i + 1
    #     })

    matches.append(row)


STAGE_TO_NUM = {
    'FNL': 10,
    'SFNL': 20,
    'QFNL': 30,
    '8FNL': 40,
    'R16': 50,
    'R32': 60,
    'R64': 70,
    'R128': 80,
    'R256': 90,
    'RND4': 100,
    'RND3': 110,
    'RND2': 120,
    'RND1': 130,
    '34': 160,
    '910': 192,
    '912': 194,
    '916': 196,
    '1616': 198,
    'GP01': 201,
    'GP02': 202,
    'GP03': 203,
    'GP04': 204,
    'GP05': 205,
    'GP06': 206,
    'GP07': 207,
    'GP08': 208,
    'GP09': 209,
    'GP10': 210,
    'GP11': 211,
    'GP12': 212,
    'GP13': 213,
    'GP14': 214,
    'GP15': 215,
    'GP16': 216,
    'GP17': 217,
    'GP18': 218,
}

def parse_event(evt):
    matches = []

    for root, dirs, files in os.walk(os.path.join('data/wtt_matches', evt)):
        for file in files:
            with open(os.path.join(root, file), 'r') as f:
                match = json.load(f)
                parse_match(match, matches)

    mf = pd.DataFrame(matches)
    if not mf.empty:
        try:
            round = mf.stage.map(STAGE_TO_NUM).astype(int)
            idx = round.sort_values().index
            mf.loc[idx].to_csv(f'data/wtt_cleaned/matches/{evt}.tsv', sep='\t', index=False)
        except pd.errors.IntCastingNaNError as e:
            print(evt, mf.stage.value_counts())
            raise e

for dir in os.listdir(directory):
    dirname = os.fsdecode(dir)

    parse_event(dirname)
