import logo from './logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
import { parquetMetadata, parquetRead } from 'hyparquet'
import tournaments from './tournaments.json'
import players from './players.json'
import { glicko } from './glicko';
import { deleteDB, openDB } from 'idb';

const empty_tourn = new Set()

const G = glicko()
const player_ratings = new Map()

export const DBNAME = 'wtt'

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
      empty_tourn.add(event_id)
      console.warn(tournaments[i])
    }
  }
  return db
}

const init = initDB()

// G.update_ratings(player_ratings, match_results, current_time)


function App() {
  const [matches, setMatches] = useState([])

  useEffect(() => {
  })

  if (matches.length == 0) {
    return (
      <div className="App">
        <div>Loading</div>
      </div>
    )
  }

  return (
    <div className="App">

    </div>
  );
}

export default App;
