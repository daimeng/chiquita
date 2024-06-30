import logo from './logo.svg';
import './App.css';
import { useCallback, useEffect, useState } from 'react';
import { parquetMetadata, parquetRead } from 'hyparquet'
import tournaments from './tournaments.json'
import players from './players.json'
import { glicko } from './glicko';
import { deleteDB, openDB } from 'idb';
import Immutable from 'immutable';

export const DBNAME = 'wtt'
export const playerById = new Map()
for (let i = 0; i < players.length; i++) {
  playerById.set(players[i].id, players[i])
}

const initDB = async () => {
  // await deleteDB(DBNAME)
  const db = await openDB(DBNAME, 1, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      console.log('Setting up db schema...')
      const matches = db.createObjectStore('matches', { autoIncrement: true })
      matches.createIndex('event_id', 'event_id', { unique: false })
      matches.createIndex('res_a', 'res_a', { unique: false })
      matches.createIndex('res_x', 'res_x', { unique: false })
    }
  })
  window.db = db

  const missing = []
  for (let i in tournaments) {
    const event_id = tournaments[i].EventId
    // fetch if we don't have the data locally
    const exists = await db.getFromIndex('matches', 'event_id', event_id)
    if (exists == null) {
      console.log('Fetching: ', event_id)
      missing.push(event_id)
    }
  }

  const results = await Promise.all(missing.map(
    m => fetch(process.env.PUBLIC_URL + `/matches/${m}.parquet`)
  ))

  for (let i in results) {
    const event_id = missing[i]

    try {
      const arrayBuffer = await results[i].arrayBuffer()
      // empty/missing tourney files will error here
      parquetMetadata(arrayBuffer)

      await parquetRead({
        file: arrayBuffer,
        onComplete: async (data) => {
          for (let row = 0; row < data.length; row++) {
            const entry = {
              event_id,
              fmt: data[row][0],
              gender: data[row][1],
              stage: data[row][2],
              stage_id: data[row][3],
              duration: data[row][4],
              a_id: data[row][5],
              x_id: data[row][6],
              res_a: data[row][7],
              res_x: data[row][8],
            }
            await db.put('matches', entry)
          }
        }
      })
    } catch {
      console.warn(tournaments[i])
    }
  }
  return db
}

let player_ratings = new Immutable.Map()
const all_ratings = []
window.all_ratings = all_ratings
const G = glicko()
const init = initDB().then((db) => {
  let p = Promise.resolve()

  for (let i in tournaments) {
    const event_id = tournaments[i].EventId
    p = p.then(() =>
      db.getAllFromIndex('matches', 'event_id', event_id)
    ).then(matches => {
      player_ratings = player_ratings.withMutations((r) => {
        G.update_ratings(r, matches, Date.parse(tournaments[i].StartDateTime))
      })
      all_ratings.push(player_ratings)
    })
  }

  return p.then(() => db)
})


function App() {
  const [ranking, setRanking] = useState([])
  const [event, setEvent] = useState(-1)
  const [gender, setGender] = useState('M')
  const [maxdev, setMaxdev] = useState(100)

  useEffect(() => {
    init.then(() => {
      let ratings = player_ratings
      if (event > 0) {
        ratings = all_ratings[event]
      }

      setRanking(
        ratings.toArray()
          .filter(x =>
            (playerById.get(x[0]).gender === gender)
            && x[1].rd < maxdev
          )
          .sort((a, b) => b[1].rating - a[1].rating)
      )
    })
  }, [gender, event, maxdev])

  const handleSetEvent = useCallback((e) => setEvent(+e.target.value))
  const handleSetMaxdev = useCallback((e) => setMaxdev(e.target.value))
  const handleSetM = useCallback(() => setGender('M'))
  const handleSetW = useCallback(() => setGender('W'))

  return (
    <div className="App">
      <div>
        <button onClick={handleSetM}>M</button>
        <button onClick={handleSetW}>W</button>

        <select value={event} onChange={handleSetEvent}>
          {tournaments.map((t, i) =>
            <option key={t.EventId} value={i}>{t.EventId}</option>
          )}
          <option key={-1} value={-1}>Latest</option>
        </select>

        <input type="range" min="0" max="350" step="10" value={maxdev}
          onChange={handleSetMaxdev} />{maxdev}
      </div>

      {ranking.map(r => {
        const player = playerById.get(r[0])
        const { rating, rd, last_active } = r[1]
        return <div className="rating_row" key={r[0]}>
          <span>{player.name}</span>
          <span>{Math.floor(rating)}</span>
          <span>{Math.floor(rd)}</span>
          <span>{(new Date(last_active)).toISOString()}</span>
        </div>
      })}
    </div>
  );
}

export default App;
