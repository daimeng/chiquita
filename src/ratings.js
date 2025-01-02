import tournaments from './tournaments.json'
import { glicko } from './glicko'
import { initDB } from "./idb"

export let rating_changes = new Map()
export let player_ratings = new Map()
export const all_ratings = []
window.all_ratings = all_ratings
export const G = glicko()

export const init = initDB().then(async (db) => {
	let p = Promise.resolve()

	for (let i in tournaments) {
		const event_id = tournaments[i].EventId
		p = p.then(() =>
			db.getAllFromIndex('matches', 'event_id', event_id)
		).then(m => {
			const deepcopy = new Map()
			player_ratings.forEach((v, k) => {
				deepcopy.set(k, { ...v })
			})

			G.update_ratings(
				deepcopy,
				m,
				Date.parse(tournaments[i].StartDateTime),
				Date.parse(tournaments[i].EndDateTime),
				rating_changes
			)
			player_ratings = deepcopy
			all_ratings.push(player_ratings)
		})
	}

	await p
	return db
})

