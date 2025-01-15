import pandas as pd
import os


tf = pd.read_csv('data/tournaments_wtt.tsv', sep='\t').sort_values(['EndDateTime'])

pf = pd.read_csv('data/wtt_cleaned/players.tsv', sep='\t').astype({'id': 'uint32'})
pf2 = pd.read_csv('data/wtt_cleaned/players_extra.tsv', sep='\t').astype({'id': 'uint32'})
pd.concat([pf, pf2]).to_json('src/players.json', orient='records')

tournaments = []
for event in tf.itertuples():
    if not os.path.isfile(f'data/wtt_cleaned/matches/{event.EventId}.tsv'):
        continue

    # should be no empty tournaments in json result
    tournaments.append(event)

    df = pd.read_csv(f'data/wtt_cleaned/matches/{event.EventId}.tsv', sep='\t', parse_dates=['start'])
    # df.sort_values(by='start', inplace=True)
    df.drop(columns=['event_id', 'doc', 'start', 'b_id', 'y_id'], inplace=True)
    df[df.fmt != 'D'].astype({
        'fmt': 'category',
        'gender': 'category',
        # 'stage': 'category',
        'stage_id': 'uint16',
        'duration': 'uint16',
        'a_id': 'uint32',
        'x_id': 'uint32',
        'res_a': 'u1',
        'res_x': 'u1',
        # 'priority': 'u1'
    }).to_parquet(
        f'public/matches/{event.EventId}.parquet', #.br
        # compression='brotli'
    )

tf2 = pd.DataFrame(t._asdict() for t in tournaments)
tf2.drop(columns=['Index']).to_json('src/tournaments.json', orient='records', index=False)


    # tournaments.to_json('src/tournaments.json', orient='records')

    # event_id	doc	fmt	gender	stage	stage_id	duration	start	a_id	b_id	x_id	y_id	res_a	res_x
    # 2345	TTEMTEAM--------------FNL-00010001--------	T	M	FNL	00010001	1560	2021-08-06 10:34:29	110267	105649	102832	101222	3	0
    # matches = []
    # for row in df[df.fmt != 'D'].itertuples():
    #     matches.append((row.a_id, row.x_id, int(row.res_a > row.res_x)))        
