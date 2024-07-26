import tournaments from './tournaments.json'
import players from './players.json'
import { parquetMetadata, parquetRead } from 'hyparquet'
import { openDB, unwrap } from 'idb'

export const DBNAME = 'wtt'
export const playerById = new Map()
for (let i = 0; i < players.length; i++) {
	playerById.set(players[i].id, players[i])
}
export const tournamentById = new Map()
for (let i = 0; i < tournaments.length; i++) {
	tournaments[i].ShortName = tournaments[i].EventName
		.replace('WTT', '')
		.replace('ITTF', '')
		.replace('World Table Tennis Championships', 'WTTC')
		.replace('Star Contender', 'Star C')
		.replace('Contender', 'Cont')
		.replace('Champions', 'Champ')
		.replace('Feeder', 'Fdr')
		.replace(/(.+) presented(.+)/i, '$1')
	tournaments[i].StartDate = tournaments[i].StartDateTime.slice(0, 10)
	tournamentById.set(tournaments[i].EventId, tournaments[i])
}

export const initDB = async () => {
	// await deleteDB(DBNAME)
	const db = await openDB(DBNAME, 1, {
		upgrade(db, oldVersion, newVersion, transaction, event) {
			console.log('Setting up db schema...')
			const matches = db.createObjectStore('matches', { keyPath: 'id', autoIncrement: true })
			matches.createIndex('event_id', 'event_id', { unique: false })
			matches.createIndex('a_id', 'a_id', { unique: false })
			matches.createIndex('x_id', 'x_id', { unique: false })
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

	const rawdb = unwrap(db)
	for (let i in results) {
		const event_id = missing[i]

		try {
			const arrayBuffer = await results[i].arrayBuffer()
			// empty/missing tourney files will error here
			parquetMetadata(arrayBuffer)

			await parquetRead({
				file: arrayBuffer,
				onComplete: (data) => {
					const matches = rawdb.transaction('matches', 'readwrite').objectStore('matches')
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
							scores: data[row][9],
						}
						matches.put(entry)
					}
				}
			})
		} catch {
			console.warn(tournaments[i])
		}
	}
	return db
}
